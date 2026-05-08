package com.tpa.client.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.service.ClaimFileStorageService;
import com.tpa.claims.service.ClaimResponseMapper;
import com.tpa.client.dto.ClientClaimRejectRequest;
import com.tpa.client.dto.ClientClaimReviewDetailsResponse;
import com.tpa.client.dto.ClientClaimValidationResponse;
import com.tpa.client.dto.ValidationCheckResponse;
import com.tpa.client.entity.ClientClaimValidation;
import com.tpa.client.enums.ClientReviewDecision;
import com.tpa.client.enums.ClientValidationStatus;
import com.tpa.client.repository.ClientClaimValidationRepository;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.customer.repository.CustomerRepository;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.security.TpaUserPrincipal;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.service.ClaimTimelineService;
import com.tpa.utils.DateTimeUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ClientClaimReviewService {

    private static final TypeReference<List<ValidationCheckResponse>> VALIDATION_RESULT_TYPE = new TypeReference<>() {
    };

    private final ClaimRepository claimRepository;
    private final ClaimDocumentRepository claimDocumentRepository;
    private final CustomerRepository customerRepository;
    private final ClientClaimValidationRepository clientClaimValidationRepository;
    private final ClaimFileStorageService claimFileStorageService;
    private final ClaimResponseMapper claimResponseMapper;
    private final ClaimTimelineService claimTimelineService;
    private final ClientClaimMatchService clientClaimMatchService;
    private final ObjectMapper objectMapper;

    public ClientClaimReviewService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            CustomerRepository customerRepository,
            ClientClaimValidationRepository clientClaimValidationRepository,
            ClaimFileStorageService claimFileStorageService,
            ClaimResponseMapper claimResponseMapper,
            ClaimTimelineService claimTimelineService,
            ClientClaimMatchService clientClaimMatchService,
            ObjectMapper objectMapper
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.customerRepository = customerRepository;
        this.clientClaimValidationRepository = clientClaimValidationRepository;
        this.claimFileStorageService = claimFileStorageService;
        this.claimResponseMapper = claimResponseMapper;
        this.claimTimelineService = claimTimelineService;
        this.clientClaimMatchService = clientClaimMatchService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getReviewQueue() {
        return claimRepository.findAllByStagesAndStatusWithDetails(
                        List.of(ClaimStage.CLIENT_REVIEW, ClaimStage.CUSTOMER_SUBMITTED),
                        ClaimStatus.SUBMITTED
                ).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClientClaimReviewDetailsResponse getClaimDetails(UUID claimId) {
        return buildReviewDetails(loadClaim(claimId));
    }

    @Transactional
    public ClientClaimValidationResponse validateClaim(UUID claimId, TpaUserPrincipal principal) {
        Claim claim = loadPendingClientReviewClaim(claimId);
        ValidationSnapshot snapshot = evaluateClaim(claim, claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId));

        ClientClaimValidation validation = saveValidation(
                claim,
                snapshot,
                principal.getEmail(),
                snapshot.passed() ? ClientValidationStatus.PASSED : ClientValidationStatus.FAILED,
                ClientReviewDecision.PENDING,
                null
        );

        return toValidationResponse(validation);
    }

    @Transactional
    public ClientClaimReviewDetailsResponse approveClaim(UUID claimId, TpaUserPrincipal principal) {
        Claim claim = loadPendingClientReviewClaim(claimId);
        ValidationSnapshot snapshot = evaluateClaim(claim, claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId));

        if (snapshot.passed()) {
            saveValidation(
                    claim,
                    snapshot,
                    principal.getEmail(),
                    ClientValidationStatus.PASSED,
                    ClientReviewDecision.FORWARDED_TO_FMG,
                    null
            );
            claim.setStatus(ClaimStatus.UNDER_REVIEW);
            claim.setStage(ClaimStage.FMG_REVIEW);
            claim.setUpdatedBy(principal.getEmail());
            claimRepository.save(claim);
            claimTimelineService.record(
                    claim,
                    ClaimStage.FMG_REVIEW,
                    ClaimStatus.UNDER_REVIEW,
                    "Client validation passed and the claim was forwarded to FMG."
            );
        } else {
            String rejectionReason = snapshot.failureSummary();
            saveValidation(
                    claim,
                    snapshot,
                    principal.getEmail(),
                    ClientValidationStatus.FAILED,
                    ClientReviewDecision.REJECTED,
                    rejectionReason
            );
            rejectClaim(claim, principal.getEmail(), rejectionReason);
        }

        return buildReviewDetails(loadClaim(claimId));
    }

    @Transactional
    public ClientClaimReviewDetailsResponse rejectClaim(
            UUID claimId,
            ClientClaimRejectRequest request,
            TpaUserPrincipal principal
    ) {
        Claim claim = loadPendingClientReviewClaim(claimId);
        ValidationSnapshot snapshot = evaluateClaim(claim, claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId));

        String rejectionReason = hasText(request == null ? null : request.rejectionReason())
                ? request.rejectionReason().trim()
                : snapshot.failureSummary();

        if (!hasText(rejectionReason)) {
            rejectionReason = "Rejected during client validation review.";
        }

        saveValidation(
                claim,
                snapshot,
                principal.getEmail(),
                snapshot.passed() ? ClientValidationStatus.PASSED : ClientValidationStatus.FAILED,
                ClientReviewDecision.REJECTED,
                rejectionReason
        );
        rejectClaim(claim, principal.getEmail(), rejectionReason);

        return buildReviewDetails(loadClaim(claimId));
    }

    @Transactional(readOnly = true)
    public ClaimDocument getDocument(UUID claimId, UUID documentId) {
        ClaimDocument document = claimDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found."));

        if (!document.getClaim().getId().equals(claimId)) {
            throw new ValidationException("Document does not belong to the selected claim.");
        }

        return document;
    }

    @Transactional(readOnly = true)
    public byte[] getDocumentContent(String storedFilePath) {
        return claimFileStorageService.readStoredFile(storedFilePath);
    }

    public String getDocumentMimeType(String fileName) {
        return claimFileStorageService.resolveMimeType(fileName);
    }

    private ClientClaimReviewDetailsResponse buildReviewDetails(Claim claim) {
        List<ClaimDocumentResponse> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claim.getId()).stream()
                .map(claimResponseMapper::toClaimDocumentResponse)
                .toList();

        ExtractedClaimDataResponse extractedData = claim.getExtractedClaimData() == null
                ? null
                : claimResponseMapper.toExtractedClaimDataResponse(claim.getExtractedClaimData());

        ClientClaimValidationResponse validation = clientClaimValidationRepository.findByClaim_Id(claim.getId())
                .map(this::toValidationResponse)
                .orElse(null);

        List<TimelineEntryDto> timeline = claimTimelineService.getClaimTimeline(claim.getId());

        return new ClientClaimReviewDetailsResponse(
                claimResponseMapper.toClaimResponse(claim),
                documents,
                extractedData,
                validation,
                timeline
        );
    }

    private Claim loadClaim(UUID claimId) {
        return claimRepository.findByIdWithReviewDetails(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));
    }

    private Claim loadPendingClientReviewClaim(UUID claimId) {
        Claim claim = loadClaim(claimId);
        if (claim.getStatus() != ClaimStatus.SUBMITTED
                || !(claim.getStage() == ClaimStage.CLIENT_REVIEW || claim.getStage() == ClaimStage.CUSTOMER_SUBMITTED)) {
            throw new ValidationException("This claim is no longer pending client validation.");
        }
        return claim;
    }

    private ValidationSnapshot evaluateClaim(Claim claim, List<ClaimDocument> documents) {
        List<ValidationCheckResponse> checks = new ArrayList<>();

        boolean customerExists = claim.getCustomer() != null
                && claim.getCustomer().getId() != null
                && customerRepository.existsById(claim.getCustomer().getId());
        checks.add(new ValidationCheckResponse(
                "CUSTOMER_EXISTS",
                "Customer exists",
                customerExists,
                customerExists
                        ? "Customer profile is present."
                        : "Customer profile could not be found for this claim."
        ));

        boolean policyBelongsToCustomer = claim.getCustomerPolicy() != null
                && claim.getCustomerPolicy().getCustomer() != null
                && claim.getCustomer() != null
                && claim.getCustomerPolicy().getCustomer().getId().equals(claim.getCustomer().getId());
        checks.add(new ValidationCheckResponse(
                "POLICY_BELONGS_TO_CUSTOMER",
                "Policy belongs to customer",
                policyBelongsToCustomer,
                policyBelongsToCustomer
                        ? "Claim policy ownership matches the customer record."
                        : "The claim policy is not linked to the same customer."
        ));

        boolean policyActive = claim.getCustomerPolicy() != null
                && claim.getCustomerPolicy().isActive()
                && !claim.getCustomerPolicy().getExpiryDate().isBefore(LocalDate.now());
        checks.add(new ValidationCheckResponse(
                "POLICY_ACTIVE",
                "Policy is active",
                policyActive,
                policyActive
                        ? "Customer policy is active."
                        : "Customer policy is inactive or already expired."
        ));

        Set<ClaimDocumentType> availableDocumentTypes = documents.stream()
                .map(ClaimDocument::getDocumentType)
                .collect(() -> EnumSet.noneOf(ClaimDocumentType.class), Set::add, Set::addAll);
        boolean requiredDocumentsExist = availableDocumentTypes.containsAll(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT)
        );
        checks.add(new ValidationCheckResponse(
                "REQUIRED_DOCUMENTS_EXIST",
                "Required documents exist",
                requiredDocumentsExist,
                requiredDocumentsExist
                        ? "Claim form and hospital document are available."
                        : "Both the claim form and hospital document must be present."
        ));

        ExtractedClaimData extractedData = claim.getExtractedClaimData();
        boolean extractedDataExists = extractedData != null;
        checks.add(new ValidationCheckResponse(
                "OCR_DATA_EXISTS",
                "OCR extracted data exists",
                extractedDataExists,
                extractedDataExists
                        ? "OCR extracted data is available."
                        : "OCR extracted data is not available for this claim."
        ));

        checks.add(fieldCheck(
                "OCR_POLICY_NUMBER",
                "Policy number present",
                extractedData != null && hasText(extractedData.getPolicyNumber()),
                "OCR policy number is present.",
                "OCR policy number is missing."
        ));
        checks.add(fieldCheck(
                "OCR_PATIENT_NAME",
                "Patient name present",
                extractedData != null && hasText(extractedData.getPatientName()),
                "OCR patient name is present.",
                "OCR patient name is missing."
        ));
        checks.add(fieldCheck(
                "OCR_HOSPITAL_NAME",
                "Hospital name present",
                extractedData != null && hasText(extractedData.getHospitalName()),
                "OCR hospital name is present.",
                "OCR hospital name is missing."
        ));
        checks.add(fieldCheck(
                "OCR_ADMISSION_DATE",
                "Admission date present",
                extractedData != null && extractedData.getAdmissionDate() != null,
                "OCR admission date is present.",
                "OCR admission date is missing."
        ));
        checks.add(fieldCheck(
                "OCR_DISCHARGE_DATE",
                "Discharge date present",
                extractedData != null && extractedData.getDischargeDate() != null,
                "OCR discharge date is present.",
                "OCR discharge date is missing."
        ));

        String expectedPolicyNumber = claim.getCustomerPolicy() == null ? null : claim.getCustomerPolicy().getUniquePolicyNumber();
        String actualPolicyNumber = extractedData == null ? null : extractedData.getPolicyNumber();
        boolean policyNumberMatches = clientClaimMatchService.matchesPolicyNumber(actualPolicyNumber, expectedPolicyNumber);
        checks.add(new ValidationCheckResponse(
                "POLICY_NUMBER_MATCH",
                "Policy number matches purchased policy",
                policyNumberMatches,
                policyNumberMatches
                        ? "OCR policy number matches the selected purchased policy."
                        : mismatchMessage(
                                "Policy number mismatch",
                                expectedPolicyNumber,
                                actualPolicyNumber,
                                "OCR policy number is missing or does not match the selected purchased policy."
                        )
        ));

        String expectedPolicyName = claim.getCustomerPolicy() == null || claim.getCustomerPolicy().getPolicy() == null
                ? null
                : claim.getCustomerPolicy().getPolicy().getPolicyName();
        String actualPolicyName = extractedData == null ? null : extractedData.getPolicyName();
        boolean policyNameMatches = clientClaimMatchService.matchesPolicyName(actualPolicyName, expectedPolicyName);
        checks.add(new ValidationCheckResponse(
                "POLICY_NAME_MATCH",
                "Policy name matches purchased policy",
                policyNameMatches,
                policyNameMatches
                        ? "OCR policy name matches the purchased policy."
                        : mismatchMessage(
                                "Policy name mismatch",
                                expectedPolicyName,
                                actualPolicyName,
                                "OCR policy name is missing or does not match the purchased policy."
                        )
        ));

        String expectedCustomerName = claim.getCustomer() == null ? null : claim.getCustomer().getFullName();
        String actualCustomerName = extractedData == null ? null : extractedData.getCustomerName();
        String actualPatientName = extractedData == null ? null : extractedData.getPatientName();
        boolean customerIdentityMatches = clientClaimMatchService.matchesPolicyHolderName(
                expectedCustomerName,
                actualCustomerName,
                actualPatientName
        );
        checks.add(new ValidationCheckResponse(
                "CUSTOMER_IDENTITY_MATCH",
                "Customer / policy holder name matches",
                customerIdentityMatches,
                customerIdentityMatches
                        ? "OCR customer or patient name matches the registered policy holder."
                        : customerIdentityMismatchMessage(expectedCustomerName, actualCustomerName, actualPatientName)
        ));

        return new ValidationSnapshot(checks);
    }

    private ValidationCheckResponse fieldCheck(
            String code,
            String label,
            boolean passed,
            String successMessage,
            String failureMessage
    ) {
        return new ValidationCheckResponse(code, label, passed, passed ? successMessage : failureMessage);
    }

    private ClientClaimValidation saveValidation(
            Claim claim,
            ValidationSnapshot snapshot,
            String reviewerEmail,
            ClientValidationStatus validationStatus,
            ClientReviewDecision reviewDecision,
            String rejectionReason
    ) {
        ClientClaimValidation validation = clientClaimValidationRepository.findByClaim_Id(claim.getId())
                .orElseGet(() -> ClientClaimValidation.builder()
                        .claim(claim)
                        .validationStatus(ClientValidationStatus.PENDING)
                        .reviewDecision(ClientReviewDecision.PENDING)
                        .build());

        validation.setValidationStatus(validationStatus);
        validation.setReviewDecision(reviewDecision);
        validation.setValidatedAt(DateTimeUtils.nowUtc());
        validation.setValidatedBy(reviewerEmail);
        validation.setRejectionReason(rejectionReason);
        validation.setValidationResultJson(writeValidationResult(snapshot.checks()));

        return clientClaimValidationRepository.save(validation);
    }

    private void rejectClaim(Claim claim, String reviewerEmail, String rejectionReason) {
        claim.setStatus(ClaimStatus.REJECTED);
        claim.setStage(ClaimStage.CLIENT_REJECTED);
        claim.setUpdatedBy(reviewerEmail);
        claimRepository.save(claim);
        claimTimelineService.record(
                claim,
                ClaimStage.CLIENT_REJECTED,
                ClaimStatus.REJECTED,
                rejectionReason
        );
    }

    private ClientClaimValidationResponse toValidationResponse(ClientClaimValidation validation) {
        return new ClientClaimValidationResponse(
                validation.getId(),
                validation.getValidationStatus(),
                validation.getReviewDecision(),
                validation.getValidatedAt(),
                validation.getValidatedBy(),
                validation.getRejectionReason(),
                readValidationResult(validation.getValidationResultJson())
        );
    }

    private String writeValidationResult(List<ValidationCheckResponse> checks) {
        try {
            return objectMapper.writeValueAsString(checks);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to persist client validation result.", exception);
        }
    }

    private List<ValidationCheckResponse> readValidationResult(String rawJson) {
        if (!hasText(rawJson)) {
            return List.of();
        }

        try {
            return objectMapper.readValue(rawJson, VALIDATION_RESULT_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to read persisted client validation result.", exception);
        }
    }

    private boolean hasText(String value) {
        return clientClaimMatchService.hasText(value);
    }

    private String mismatchMessage(String label, String expectedValue, String actualValue, String fallbackMessage) {
        if (!hasText(expectedValue) && !hasText(actualValue)) {
            return fallbackMessage;
        }

        return String.format(
                "%s. Expected \"%s\" but found \"%s\" in the uploaded OCR data.",
                label,
                displayValue(expectedValue),
                displayValue(actualValue)
        );
    }

    private String customerIdentityMismatchMessage(
            String expectedCustomerName,
            String actualCustomerName,
            String actualPatientName
    ) {
        return String.format(
                "Customer / policy holder name mismatch. Registered customer is \"%s\" but OCR extracted customer name \"%s\" and patient name \"%s\" did not match.",
                displayValue(expectedCustomerName),
                displayValue(actualCustomerName),
                displayValue(actualPatientName)
        );
    }

    private String displayValue(String value) {
        return hasText(value) ? value.trim() : "N/A";
    }

    private record ValidationSnapshot(List<ValidationCheckResponse> checks) {

        private boolean passed() {
            return checks.stream().allMatch(ValidationCheckResponse::passed);
        }

        private String failureSummary() {
            return checks.stream()
                    .filter(check -> !check.passed())
                    .map(ValidationCheckResponse::message)
                    .reduce((left, right) -> left + "; " + right)
                    .orElse("");
        }
    }
}
