package com.tpa.fmg.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.service.ClaimFileStorageService;
import com.tpa.claims.service.ClaimResponseMapper;
import com.tpa.client.dto.ValidationCheckResponse;
import com.tpa.client.dto.ClientClaimValidationResponse;
import com.tpa.client.entity.ClientClaimValidation;
import com.tpa.client.enums.ClientReviewDecision;
import com.tpa.client.enums.ClientValidationStatus;
import com.tpa.client.repository.ClientClaimValidationRepository;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.fmg.dto.FmgConfirmDecisionRequest;
import com.tpa.fmg.dto.FmgClaimDecisionResponse;
import com.tpa.fmg.dto.FmgClaimReviewDetailsResponse;
import com.tpa.fmg.dto.FmgManualReviewRequest;
import com.tpa.fmg.dto.FmgManualReviewResponse;
import com.tpa.fmg.dto.FmgRuleTriggerResponse;
import com.tpa.fmg.entity.FmgClaimDecision;
import com.tpa.fmg.entity.FmgClaimDecisionRule;
import com.tpa.fmg.entity.FmgManualReview;
import com.tpa.fmg.repository.FmgClaimDecisionRepository;
import com.tpa.fmg.repository.FmgManualReviewRepository;
import com.tpa.rules.dto.FmgRuleEvaluationResult;
import com.tpa.rules.dto.FmgRuleTrigger;
import com.tpa.rules.service.FmgRuleContextFactory;
import com.tpa.rules.service.FmgRuleEngineService;
import com.tpa.security.TpaUserPrincipal;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.service.ClaimTimelineService;
import com.tpa.utils.DateTimeUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FmgClaimReviewService {

    private static final TypeReference<List<ValidationCheckResponse>> VALIDATION_RESULT_TYPE = new TypeReference<>() {
    };

    private final ClaimRepository claimRepository;
    private final ClaimDocumentRepository claimDocumentRepository;
    private final ClientClaimValidationRepository clientClaimValidationRepository;
    private final FmgClaimDecisionRepository fmgClaimDecisionRepository;
    private final FmgManualReviewRepository fmgManualReviewRepository;
    private final ClaimFileStorageService claimFileStorageService;
    private final ClaimResponseMapper claimResponseMapper;
    private final ClaimTimelineService claimTimelineService;
    private final FmgRuleContextFactory fmgRuleContextFactory;
    private final FmgRuleEngineService fmgRuleEngineService;
    private final ObjectMapper objectMapper;

    public FmgClaimReviewService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            ClientClaimValidationRepository clientClaimValidationRepository,
            FmgClaimDecisionRepository fmgClaimDecisionRepository,
            FmgManualReviewRepository fmgManualReviewRepository,
            ClaimFileStorageService claimFileStorageService,
            ClaimResponseMapper claimResponseMapper,
            ClaimTimelineService claimTimelineService,
            FmgRuleContextFactory fmgRuleContextFactory,
            FmgRuleEngineService fmgRuleEngineService,
            ObjectMapper objectMapper
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.clientClaimValidationRepository = clientClaimValidationRepository;
        this.fmgClaimDecisionRepository = fmgClaimDecisionRepository;
        this.fmgManualReviewRepository = fmgManualReviewRepository;
        this.claimFileStorageService = claimFileStorageService;
        this.claimResponseMapper = claimResponseMapper;
        this.claimTimelineService = claimTimelineService;
        this.fmgRuleContextFactory = fmgRuleContextFactory;
        this.fmgRuleEngineService = fmgRuleEngineService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getReviewQueue() {
        return claimRepository.findAllByStageAndStatusWithDetails(
                        ClaimStage.FMG_REVIEW,
                        ClaimStatus.UNDER_REVIEW
                ).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FmgClaimReviewDetailsResponse getClaimDetails(UUID claimId) {
        Claim claim = loadClaim(claimId);
        ClientClaimValidation validation = loadForwardedClientValidation(claimId);
        return buildReviewDetails(claim, validation);
    }

    @Transactional
    public FmgClaimReviewDetailsResponse evaluateClaim(UUID claimId, TpaUserPrincipal principal) {
        Claim claim = loadPendingFmgClaim(claimId);
        ClientClaimValidation validation = loadForwardedClientValidation(claimId);
        List<ClaimDocument> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId);

        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(
                fmgRuleContextFactory.create(claim, documents)
        );

        persistEvaluation(claim, result, principal.getEmail());
        claimTimelineService.record(
                claim,
                ClaimStage.FMG_REVIEW,
                ClaimStatus.UNDER_REVIEW,
                evaluationTimelineDescription(result)
        );

        return buildReviewDetails(loadClaim(claimId), validation);
    }

    @Transactional
    public FmgClaimReviewDetailsResponse confirmDecision(
            UUID claimId,
            FmgConfirmDecisionRequest request,
            TpaUserPrincipal principal
    ) {
        Claim claim = loadPendingFmgClaim(claimId);
        ClientClaimValidation validation = loadForwardedClientValidation(claimId);
        FmgClaimDecision decision = loadEvaluatedDecision(claimId);
        ClaimStatus finalDecision = resolveConfirmedDecision(request, decision);

        decision.setFinalDecision(finalDecision);
        decision.setConfirmedAt(DateTimeUtils.nowUtc());
        decision.setConfirmedBy(principal.getEmail());
        decision.setStatusAfterDecision(finalDecision);
        decision.setStageAfterDecision(resolveResultingStage(finalDecision));
        fmgClaimDecisionRepository.save(decision);

        applyConfirmedDecision(claim, finalDecision, principal.getEmail());
        return buildReviewDetails(loadClaim(claimId), validation);
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

    // ── Manual Review Workflow ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ClaimResponse> getManualReviewQueue() {
        return claimRepository.findAllByStageAndStatusWithDetails(
                        ClaimStage.FMG_MANUAL_REVIEW,
                        ClaimStatus.MANUAL_REVIEW
                ).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FmgClaimReviewDetailsResponse getManualReviewDetails(UUID claimId) {
        Claim claim = loadClaim(claimId);
        ClientClaimValidation validation = loadForwardedClientValidation(claimId);
        return buildReviewDetails(claim, validation);
    }

    @Transactional
    public FmgClaimReviewDetailsResponse submitManualReview(
            UUID claimId,
            FmgManualReviewRequest request,
            TpaUserPrincipal principal
    ) {
        Claim claim = loadPendingManualReviewClaim(claimId);
        ClientClaimValidation validation = loadForwardedClientValidation(claimId);
        validateManualReviewRequest(request);

        FmgClaimDecision fmgDecision = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claimId)
                .orElse(null);

        FmgManualReview review = fmgManualReviewRepository.findByClaimId(claimId)
                .orElseGet(() -> FmgManualReview.builder()
                        .claim(claim)
                        .decision(fmgDecision)
                        .build());

        ClaimStatus manualDecision = request.decision();
        ClaimStage resultingStage = resolveManualReviewStage(manualDecision);

        review.setReviewerNotes(request.reviewerNotes());
        review.setManualDecision(manualDecision);
        review.setStatusAfterDecision(manualDecision);
        review.setStageAfterDecision(resultingStage);
        review.setReviewedAt(DateTimeUtils.nowUtc());
        review.setReviewedBy(principal.getEmail());
        fmgManualReviewRepository.save(review);

        claim.setStatus(manualDecision);
        claim.setStage(resultingStage);
        claim.setUpdatedBy(principal.getEmail());
        claimRepository.save(claim);

        claimTimelineService.record(
                claim,
                resultingStage,
                manualDecision,
                manualReviewTimelineDescription(manualDecision, principal.getEmail())
        );

        return buildReviewDetails(loadClaim(claimId), validation);
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private FmgClaimReviewDetailsResponse buildReviewDetails(Claim claim, ClientClaimValidation validation) {
        List<ClaimDocumentResponse> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claim.getId()).stream()
                .map(claimResponseMapper::toClaimDocumentResponse)
                .toList();

        ExtractedClaimDataResponse extractedData = claim.getExtractedClaimData() == null
                ? null
                : claimResponseMapper.toExtractedClaimDataResponse(claim.getExtractedClaimData());

        ClientClaimValidationResponse validationResponse = toValidationResponse(validation);
        FmgClaimDecisionResponse decisionResponse = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claim.getId())
                .map(this::toDecisionResponse)
                .orElse(null);
        FmgManualReviewResponse manualReviewResponse = fmgManualReviewRepository.findByClaimId(claim.getId())
                .map(this::toManualReviewResponse)
                .orElse(null);
        List<TimelineEntryDto> timeline = claimTimelineService.getClaimTimeline(claim.getId());

        return new FmgClaimReviewDetailsResponse(
                claimResponseMapper.toClaimResponse(claim),
                documents,
                extractedData,
                validationResponse,
                decisionResponse,
                manualReviewResponse,
                timeline
        );
    }

    private Claim loadClaim(UUID claimId) {
        return claimRepository.findByIdWithReviewDetails(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));
    }

    private Claim loadPendingFmgClaim(UUID claimId) {
        Claim claim = loadClaim(claimId);
        if (claim.getStatus() != ClaimStatus.UNDER_REVIEW || claim.getStage() != ClaimStage.FMG_REVIEW) {
            throw new ValidationException("This claim is no longer pending FMG rule evaluation.");
        }
        return claim;
    }

    private Claim loadPendingManualReviewClaim(UUID claimId) {
        Claim claim = loadClaim(claimId);
        if (claim.getStatus() != ClaimStatus.MANUAL_REVIEW || claim.getStage() != ClaimStage.FMG_MANUAL_REVIEW) {
            throw new ValidationException("This claim is not pending FMG manual review.");
        }
        return claim;
    }

    private ClientClaimValidation loadForwardedClientValidation(UUID claimId) {
        ClientClaimValidation validation = clientClaimValidationRepository.findByClaim_Id(claimId)
                .orElseThrow(() -> new ValidationException("Client validation record not found for this claim."));

        if (validation.getValidationStatus() != ClientValidationStatus.PASSED
                || validation.getReviewDecision() != ClientReviewDecision.FORWARDED_TO_FMG) {
            throw new ValidationException("This claim has not been forwarded to FMG after client validation.");
        }

        return validation;
    }

    private void applyConfirmedDecision(Claim claim, ClaimStatus finalDecision, String reviewerEmail) {
        claim.setStatus(finalDecision);
        claim.setStage(resolveResultingStage(finalDecision));
        claim.setUpdatedBy(reviewerEmail);
        claimRepository.save(claim);

        claimTimelineService.record(
                claim,
                resolveResultingStage(finalDecision),
                finalDecision,
                confirmationTimelineDescription(finalDecision)
        );
    }

    private void persistEvaluation(Claim claim, FmgRuleEvaluationResult result, String reviewerEmail) {
        FmgClaimDecision decision = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claim.getId())
                .orElseGet(() -> FmgClaimDecision.builder().claim(claim).build());

        decision.setRecommendedDecision(result.decision());
        decision.setStatusAfterDecision(result.resultingStatus());
        decision.setStageAfterDecision(result.resultingStage());
        decision.setEvaluatedAt(DateTimeUtils.nowUtc());
        decision.setEvaluatedBy(reviewerEmail);
        decision.setFinalDecision(null);
        decision.setConfirmedAt(null);
        decision.setConfirmedBy(null);
        decision.replaceTriggeredRules(result.triggeredRules().stream()
                .map(this::toDecisionRuleEntity)
                .toList());

        fmgClaimDecisionRepository.save(decision);
    }

    private FmgClaimDecisionRule toDecisionRuleEntity(FmgRuleTrigger trigger) {
        return FmgClaimDecisionRule.builder()
                .ruleCode(trigger.code())
                .ruleName(trigger.name())
                .ruleOrder(trigger.order())
                .ruleOutcome(trigger.outcome())
                .message(trigger.message())
                .build();
    }

    private String evaluationTimelineDescription(FmgRuleEvaluationResult result) {
        String triggerSummary = result.triggeredRules().isEmpty()
                ? ""
                : " Triggered rules: " + result.triggeredRules().stream()
                .map(FmgRuleTrigger::code)
                .reduce((left, right) -> left + ", " + right)
                .orElse("") + ".";

        return switch (result.decision()) {
            case APPROVED -> "FMG rule evaluation recommended APPROVED." + triggerSummary;
            case REJECTED -> "FMG rule evaluation recommended REJECTED." + triggerSummary;
            case MANUAL_REVIEW -> "FMG rule evaluation recommended MANUAL_REVIEW." + triggerSummary;
            default -> throw new IllegalStateException("Unsupported FMG decision: " + result.decision());
        };
    }

    private String confirmationTimelineDescription(ClaimStatus finalDecision) {
        return switch (finalDecision) {
            case APPROVED -> "FMG confirmed APPROVED and forwarded the claim to carrier review.";
            case REJECTED -> "FMG confirmed REJECTED and completed the claim.";
            case MANUAL_REVIEW -> "FMG confirmed MANUAL_REVIEW and routed the claim for FMG manual review.";
            default -> throw new IllegalStateException("Unsupported FMG decision: " + finalDecision);
        };
    }

    private String manualReviewTimelineDescription(ClaimStatus manualDecision, String reviewerEmail) {
        return switch (manualDecision) {
            case APPROVED -> "FMG manual review APPROVED by " + reviewerEmail + ". Claim forwarded to carrier review.";
            case REJECTED -> "FMG manual review REJECTED by " + reviewerEmail + ". Claim completed.";
            default -> throw new IllegalStateException("Unsupported manual review decision: " + manualDecision);
        };
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

    private FmgClaimDecisionResponse toDecisionResponse(FmgClaimDecision decision) {
        return new FmgClaimDecisionResponse(
                decision.getId(),
                decision.getRecommendedDecision(),
                decision.getStatusAfterDecision(),
                decision.getStageAfterDecision(),
                decision.getEvaluatedAt(),
                decision.getEvaluatedBy(),
                decision.getFinalDecision(),
                decision.getConfirmedAt(),
                decision.getConfirmedBy(),
                decision.isConfirmed(),
                decision.getTriggeredRules().stream()
                        .sorted(java.util.Comparator.comparingInt(FmgClaimDecisionRule::getRuleOrder))
                        .map(rule -> new FmgRuleTriggerResponse(
                                rule.getRuleCode(),
                                rule.getRuleName(),
                                rule.getRuleOrder(),
                                rule.getRuleOutcome(),
                                rule.getMessage()
                        ))
                        .toList()
        );
    }

    private FmgManualReviewResponse toManualReviewResponse(FmgManualReview review) {
        return new FmgManualReviewResponse(
                review.getId(),
                review.getManualDecision(),
                review.getReviewerNotes(),
                review.getStatusAfterDecision(),
                review.getStageAfterDecision(),
                review.getReviewedAt(),
                review.getReviewedBy(),
                review.isReviewed()
        );
    }

    private List<ValidationCheckResponse> readValidationResult(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(rawJson, VALIDATION_RESULT_TYPE);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to read persisted client validation result.", exception);
        }
    }

    private FmgClaimDecision loadEvaluatedDecision(UUID claimId) {
        FmgClaimDecision decision = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claimId)
                .orElseThrow(() -> new ValidationException("Run FMG evaluation before confirming a decision."));

        if (decision.getRecommendedDecision() == null) {
            throw new ValidationException("Run FMG evaluation before confirming a decision.");
        }

        return decision;
    }

    private ClaimStatus resolveConfirmedDecision(FmgConfirmDecisionRequest request, FmgClaimDecision decision) {
        if (request == null || request.decision() == null) {
            throw new ValidationException("A final FMG decision is required for confirmation.");
        }

        ClaimStatus requestedDecision = request.decision();
        if (!Set.of(ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.MANUAL_REVIEW).contains(requestedDecision)) {
            throw new ValidationException("Only APPROVED, REJECTED, or MANUAL_REVIEW can be confirmed by FMG.");
        }

        if (requestedDecision != decision.getRecommendedDecision()) {
            throw new ValidationException("Confirmed FMG decision must match the latest rule evaluation result.");
        }

        return requestedDecision;
    }

    private void validateManualReviewRequest(FmgManualReviewRequest request) {
        if (request == null || request.decision() == null) {
            throw new ValidationException("A manual review decision is required.");
        }

        if (!Set.of(ClaimStatus.APPROVED, ClaimStatus.REJECTED).contains(request.decision())) {
            throw new ValidationException("Manual review decision must be either APPROVED or REJECTED.");
        }

        if (request.reviewerNotes() == null || request.reviewerNotes().isBlank()) {
            throw new ValidationException("Reviewer notes are required for manual review.");
        }

        if (request.reviewerNotes().length() > 2000) {
            throw new ValidationException("Reviewer notes must not exceed 2000 characters.");
        }
    }

    private ClaimStage resolveResultingStage(ClaimStatus finalDecision) {
        return switch (finalDecision) {
            case APPROVED -> ClaimStage.CARRIER_REVIEW;
            case REJECTED -> ClaimStage.COMPLETED;
            case MANUAL_REVIEW -> ClaimStage.FMG_MANUAL_REVIEW;
            default -> throw new IllegalStateException("Unsupported FMG decision: " + finalDecision);
        };
    }

    private ClaimStage resolveManualReviewStage(ClaimStatus manualDecision) {
        return switch (manualDecision) {
            case APPROVED -> ClaimStage.CARRIER_REVIEW;
            case REJECTED -> ClaimStage.COMPLETED;
            default -> throw new IllegalStateException("Unsupported manual review decision: " + manualDecision);
        };
    }
}
