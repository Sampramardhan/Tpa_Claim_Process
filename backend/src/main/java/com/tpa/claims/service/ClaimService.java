package com.tpa.claims.service;

import com.tpa.claims.dto.ClaimDetailsResponse;
import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.CreateClaimUploadRequest;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.dto.StoredClaimFile;
import com.tpa.claims.dto.UpdateExtractedClaimDataRequest;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.claims.enums.OcrStatus;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.ExtractedClaimDataRepository;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.customer.entity.Customer;
import com.tpa.customer.repository.CustomerRepository;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.ocr.service.ClaimOcrRequestedEvent;
import com.tpa.policies.entity.CustomerPolicy;
import com.tpa.policies.repository.CustomerPolicyRepository;
import com.tpa.security.TpaUserPrincipal;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.service.ClaimTimelineService;
import com.tpa.utils.DateTimeUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Foundational claim service for claim registration and read APIs only.
 * OCR ingestion, uploads, approval flows, validation rules, and carrier processing
 * are intentionally excluded from this block.
 */
@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ClaimDocumentRepository claimDocumentRepository;
    private final ExtractedClaimDataRepository extractedClaimDataRepository;
    private final CustomerRepository customerRepository;
    private final CustomerPolicyRepository customerPolicyRepository;
    private final ClaimNumberGenerator claimNumberGenerator;
    private final ClaimFileStorageService claimFileStorageService;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ClaimResponseMapper claimResponseMapper;
    private final ClaimTimelineService claimTimelineService;

    public ClaimService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            ExtractedClaimDataRepository extractedClaimDataRepository,
            CustomerRepository customerRepository,
            CustomerPolicyRepository customerPolicyRepository,
            ClaimNumberGenerator claimNumberGenerator,
            ClaimFileStorageService claimFileStorageService,
            ApplicationEventPublisher applicationEventPublisher,
            ClaimResponseMapper claimResponseMapper,
            ClaimTimelineService claimTimelineService
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.extractedClaimDataRepository = extractedClaimDataRepository;
        this.customerRepository = customerRepository;
        this.customerPolicyRepository = customerPolicyRepository;
        this.claimNumberGenerator = claimNumberGenerator;
        this.claimFileStorageService = claimFileStorageService;
        this.applicationEventPublisher = applicationEventPublisher;
        this.claimResponseMapper = claimResponseMapper;
        this.claimTimelineService = claimTimelineService;
    }

    @Transactional
    public ClaimResponse createClaim(CreateClaimUploadRequest request, TpaUserPrincipal principal) {
        Customer customer = customerRepository.findByUser_Id(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        CustomerPolicy customerPolicy = customerPolicyRepository.findByIdAndCustomerIdWithPolicyDetails(
                        request.getCustomerPolicyId(),
                        customer.getId()
                )
                .orElseThrow(() -> new ResourceNotFoundException("Customer policy not found."));

        if (!customerPolicy.isActive()) {
            throw new ValidationException("Inactive customer policies cannot be used to create a claim.");
        }

        LocalDateTime draftCreatedAt = DateTimeUtils.nowUtc();

        Claim claim = Claim.builder()
                .claimNumber(claimNumberGenerator.generate())
                .customer(customer)
                .customerPolicy(customerPolicy)
                .status(ClaimStatus.DRAFT)
                .stage(ClaimStage.DRAFT)
                .submissionDate(draftCreatedAt)
                .createdBy(principal.getEmail())
                .updatedBy(principal.getEmail())
                .build();

        Claim savedClaim = claimRepository.save(claim);
        claimRepository.flush();

        try {
            StoredClaimFile claimFormFile = claimFileStorageService.storeClaimDocument(
                    savedClaim.getClaimNumber(),
                    ClaimDocumentType.CLAIM_FORM,
                    request.getClaimForm()
            );
            StoredClaimFile hospitalDocumentFile = claimFileStorageService.storeClaimDocument(
                    savedClaim.getClaimNumber(),
                    ClaimDocumentType.HOSPITAL_DOCUMENT,
                    request.getHospitalDocument()
            );

            claimDocumentRepository.saveAll(List.of(
                    toClaimDocument(savedClaim, claimFormFile),
                    toClaimDocument(savedClaim, hospitalDocumentFile)
            ));
            claimDocumentRepository.flush();
        } catch (RuntimeException exception) {
            try {
                claimFileStorageService.deleteClaimFiles(savedClaim.getClaimNumber());
            } catch (RuntimeException cleanupException) {
                exception.addSuppressed(cleanupException);
            }
            throw exception;
        }

        ExtractedClaimData extractedClaimData = extractedClaimDataRepository.save(
                ExtractedClaimData.builder()
                        .claim(savedClaim)
                        .ocrStatus(OcrStatus.PENDING)
                        .build()
        );
        extractedClaimDataRepository.flush();
        savedClaim.setExtractedClaimData(extractedClaimData);
        claimTimelineService.record(
                savedClaim,
                ClaimStage.DRAFT,
                ClaimStatus.DRAFT,
                "Claim draft created and required documents uploaded."
        );

        applicationEventPublisher.publishEvent(new ClaimOcrRequestedEvent(savedClaim.getId()));
        return claimResponseMapper.toClaimResponse(savedClaim);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getMyClaims(TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());
        return claimRepository.findAllByCustomerIdWithPolicyDetails(customer.getId()).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClaimDetailsResponse getMyClaim(UUID claimId, TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());

        Claim claim = claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

        List<ClaimDocumentResponse> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId)
                .stream()
                .map(claimResponseMapper::toClaimDocumentResponse)
                .toList();

        ExtractedClaimDataResponse extractedData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .map(claimResponseMapper::toExtractedClaimDataResponse)
                .orElse(null);

        List<TimelineEntryDto> timeline = claimTimelineService.getClaimTimeline(claimId);

        return new ClaimDetailsResponse(
                claimResponseMapper.toClaimResponse(claim),
                documents,
                extractedData,
                timeline
        );
    }

    @Transactional
    public ClaimResponse submitMyClaim(UUID claimId, TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());

        Claim claim = claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

        assertClaimEditable(claim);

        ExtractedClaimData extractedClaimData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Extracted claim data not found."));

        if (!isTerminalOcrStatus(extractedClaimData.getOcrStatus())) {
            throw new ValidationException("Claim OCR review is still in progress.");
        }

        claim.setStatus(ClaimStatus.SUBMITTED);
        claim.setStage(ClaimStage.CLIENT_REVIEW);
        claim.setSubmissionDate(DateTimeUtils.nowUtc());
        claim.setUpdatedBy(principal.getEmail());

        Claim savedClaim = claimRepository.save(claim);
        savedClaim.setExtractedClaimData(extractedClaimData);
        claimTimelineService.record(
                savedClaim,
                ClaimStage.CLIENT_REVIEW,
                ClaimStatus.SUBMITTED,
                "Customer submitted the claim for client-side validation."
        );

        applicationEventPublisher.publishEvent(new ClaimSubmittedEvent(savedClaim.getId(), principal.getEmail()));

        // Reload the claim as the event listener may have updated it automatically
        Claim finalClaim = claimRepository.findById(savedClaim.getId()).orElse(savedClaim);
        return claimResponseMapper.toClaimResponse(finalClaim);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getClientReviewQueue() {
        return claimRepository.findAllByStageAndStatusWithDetails(
                        ClaimStage.CLIENT_REVIEW,
                        ClaimStatus.SUBMITTED
                ).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional
    public ExtractedClaimDataResponse updateMyClaimExtractedData(
            UUID claimId,
            UpdateExtractedClaimDataRequest request,
            TpaUserPrincipal principal
    ) {
        Customer customer = resolveCustomer(principal.getId());

        Claim claim = claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

        assertClaimEditable(claim);

        ExtractedClaimData extractedClaimData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Extracted claim data not found."));

        extractedClaimData.setPolicyNumber(request.policyNumber());
        extractedClaimData.setCustomerName(request.customerName());
        extractedClaimData.setPatientName(request.patientName());
        extractedClaimData.setCarrierName(request.carrierName());
        extractedClaimData.setPolicyName(request.policyName());
        extractedClaimData.setHospitalName(request.hospitalName());
        extractedClaimData.setAdmissionDate(request.admissionDate());
        extractedClaimData.setDischargeDate(request.dischargeDate());
        extractedClaimData.setClaimedAmount(request.claimedAmount());
        extractedClaimData.setClaimType(request.claimType());
        extractedClaimData.setDiagnosis(request.diagnosis());
        extractedClaimData.setBillNumber(request.billNumber());
        extractedClaimData.setBillDate(request.billDate());
        extractedClaimData.setTotalBillAmount(request.totalBillAmount());

        ExtractedClaimData savedData = extractedClaimDataRepository.save(extractedClaimData);
        return claimResponseMapper.toExtractedClaimDataResponse(savedData);
    }

    @Transactional(readOnly = true)
    public byte[] getDocumentContent(String storedFilePath) {
        return claimFileStorageService.readStoredFile(storedFilePath);
    }

    @Transactional(readOnly = true)
    public ClaimDocument getDocument(UUID claimId, UUID documentId, TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());

        ClaimDocument document = claimDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found."));

        if (!document.getClaim().getId().equals(claimId) || !document.getClaim().getCustomer().getId().equals(customer.getId())) {
            throw new ValidationException("You do not have permission to access this document.");
        }

        return document;
    }

    public String getDocumentMimeType(String fileName) {
        return claimFileStorageService.resolveMimeType(fileName);
    }

    private Customer resolveCustomer(UUID userId) {
        return customerRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
    }

    private void assertClaimEditable(Claim claim) {
        if (claim.getStatus() != ClaimStatus.DRAFT || claim.getStage() != ClaimStage.DRAFT) {
            throw new ValidationException("Claim has already been submitted and can no longer be edited.");
        }
    }

    private boolean isTerminalOcrStatus(OcrStatus ocrStatus) {
        return ocrStatus == OcrStatus.COMPLETED || ocrStatus == OcrStatus.FAILED;
    }

    private ClaimDocument toClaimDocument(Claim claim, StoredClaimFile storedFile) {
        return ClaimDocument.builder()
                .claim(claim)
                .documentType(storedFile.documentType())
                .originalFileName(storedFile.originalFileName())
                .storedFileName(storedFile.storedFileName())
                .storedFilePath(storedFile.storedFilePath())
                .uploadedAt(storedFile.uploadedAt())
                .build();
    }

}
