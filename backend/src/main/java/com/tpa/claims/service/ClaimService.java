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

    public ClaimService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            ExtractedClaimDataRepository extractedClaimDataRepository,
            CustomerRepository customerRepository,
            CustomerPolicyRepository customerPolicyRepository,
            ClaimNumberGenerator claimNumberGenerator,
            ClaimFileStorageService claimFileStorageService,
            ApplicationEventPublisher applicationEventPublisher
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.extractedClaimDataRepository = extractedClaimDataRepository;
        this.customerRepository = customerRepository;
        this.customerPolicyRepository = customerPolicyRepository;
        this.claimNumberGenerator = claimNumberGenerator;
        this.claimFileStorageService = claimFileStorageService;
        this.applicationEventPublisher = applicationEventPublisher;
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

        LocalDateTime submissionDate = DateTimeUtils.nowUtc();

        Claim claim = Claim.builder()
                .claimNumber(claimNumberGenerator.generate())
                .customer(customer)
                .customerPolicy(customerPolicy)
                .status(ClaimStatus.SUBMITTED)
                .stage(ClaimStage.CUSTOMER)
                .submissionDate(submissionDate)
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

        applicationEventPublisher.publishEvent(new ClaimOcrRequestedEvent(savedClaim.getId()));
        return toClaimResponse(savedClaim);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getMyClaims(TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());
        return claimRepository.findAllByCustomerIdWithPolicyDetails(customer.getId()).stream()
                .map(this::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClaimDetailsResponse getMyClaim(UUID claimId, TpaUserPrincipal principal) {
        Customer customer = resolveCustomer(principal.getId());

        Claim claim = claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

        List<ClaimDocumentResponse> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId)
                .stream()
                .map(this::toClaimDocumentResponse)
                .toList();

        ExtractedClaimDataResponse extractedData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .map(this::toExtractedClaimDataResponse)
                .orElse(null);

        return new ClaimDetailsResponse(toClaimResponse(claim), documents, extractedData);
    }

    @Transactional
    public ExtractedClaimDataResponse updateMyClaimExtractedData(
            UUID claimId,
            UpdateExtractedClaimDataRequest request,
            TpaUserPrincipal principal
    ) {
        Customer customer = resolveCustomer(principal.getId());

        claimRepository.findByIdAndCustomerIdWithPolicyDetails(claimId, customer.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));

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
        return toExtractedClaimDataResponse(savedData);
    }

    private Customer resolveCustomer(UUID userId) {
        return customerRepository.findByUser_Id(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
    }

    private ClaimResponse toClaimResponse(Claim claim) {
        return new ClaimResponse(
                claim.getId(),
                claim.getClaimNumber(),
                claim.getCustomer().getId(),
                claim.getCustomerPolicy().getId(),
                claim.getCustomerPolicy().getUniquePolicyNumber(),
                claim.getCustomerPolicy().getPolicy().getPolicyName(),
                claim.getCustomerPolicy().getPolicy().getCarrier().getCarrierName(),
                claim.getExtractedClaimData() == null ? null : claim.getExtractedClaimData().getOcrStatus(),
                claim.getStatus(),
                claim.getStage(),
                claim.getSubmissionDate(),
                claim.getCreatedAt(),
                claim.getUpdatedAt()
        );
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

    private ClaimDocumentResponse toClaimDocumentResponse(ClaimDocument document) {
        return new ClaimDocumentResponse(
                document.getId(),
                document.getClaim().getId(),
                document.getDocumentType(),
                document.getOriginalFileName(),
                document.getStoredFileName(),
                document.getStoredFilePath(),
                document.getUploadedAt()
        );
    }

    private ExtractedClaimDataResponse toExtractedClaimDataResponse(ExtractedClaimData data) {
        return new ExtractedClaimDataResponse(
                data.getId(),
                data.getClaim().getId(),
                data.getOcrStatus(),
                data.getOcrProcessedAt(),
                data.getOcrFailureReason(),
                data.getPolicyNumber(),
                data.getCustomerName(),
                data.getPatientName(),
                data.getCarrierName(),
                data.getPolicyName(),
                data.getHospitalName(),
                data.getAdmissionDate(),
                data.getDischargeDate(),
                data.getClaimType(),
                data.getDiagnosis(),
                data.getBillNumber(),
                data.getBillDate(),
                data.getTotalBillAmount(),
                data.getClaimedAmount()
        );
    }
}
