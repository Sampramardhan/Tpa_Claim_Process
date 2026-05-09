package com.tpa.carrier.service;

import com.tpa.carrier.dto.CarrierClaimReviewDetailsResponse;
import com.tpa.carrier.dto.CarrierDecisionRequest;
import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.service.ClaimFileStorageService;
import com.tpa.claims.service.ClaimResponseMapper;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.fmg.dto.FmgClaimDecisionResponse;
import com.tpa.fmg.dto.FmgManualReviewResponse;
import com.tpa.fmg.dto.FmgRuleTriggerResponse;
import com.tpa.fmg.entity.FmgClaimDecision;
import com.tpa.fmg.entity.FmgClaimDecisionRule;
import com.tpa.fmg.entity.FmgManualReview;
import com.tpa.fmg.repository.FmgClaimDecisionRepository;
import com.tpa.fmg.repository.FmgManualReviewRepository;
import com.tpa.security.TpaUserPrincipal;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.service.ClaimTimelineService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CarrierClaimReviewService {

    private final ClaimRepository claimRepository;
    private final ClaimDocumentRepository claimDocumentRepository;
    private final FmgClaimDecisionRepository fmgClaimDecisionRepository;
    private final FmgManualReviewRepository fmgManualReviewRepository;
    private final ClaimFileStorageService claimFileStorageService;
    private final ClaimResponseMapper claimResponseMapper;
    private final ClaimTimelineService claimTimelineService;

    public CarrierClaimReviewService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            FmgClaimDecisionRepository fmgClaimDecisionRepository,
            FmgManualReviewRepository fmgManualReviewRepository,
            ClaimFileStorageService claimFileStorageService,
            ClaimResponseMapper claimResponseMapper,
            ClaimTimelineService claimTimelineService
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.fmgClaimDecisionRepository = fmgClaimDecisionRepository;
        this.fmgManualReviewRepository = fmgManualReviewRepository;
        this.claimFileStorageService = claimFileStorageService;
        this.claimResponseMapper = claimResponseMapper;
        this.claimTimelineService = claimTimelineService;
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getReviewQueue() {
        return claimRepository.findAllByStageAndStatusWithDetails(
                        ClaimStage.CARRIER_REVIEW,
                        ClaimStatus.UNDER_REVIEW
                ).stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getHistoryQueue() {
        return claimRepository.findCarrierHistory().stream()
                .map(claimResponseMapper::toClaimResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CarrierClaimReviewDetailsResponse getClaimDetails(UUID claimId) {
        Claim claim = loadClaim(claimId);
        return buildReviewDetails(claim);
    }

    @Transactional
    public CarrierClaimReviewDetailsResponse approvePayment(
            UUID claimId,
            CarrierDecisionRequest request,
            TpaUserPrincipal principal
    ) {
        Claim claim = loadPendingCarrierClaim(claimId);

        claim.setStatus(ClaimStatus.PAID);
        claim.setStage(ClaimStage.COMPLETED);
        claim.setUpdatedBy(principal.getEmail());
        claimRepository.save(claim);

        String notes = request != null && request.reviewerNotes() != null && !request.reviewerNotes().isBlank() 
                ? " Notes: " + request.reviewerNotes() 
                : "";

        claimTimelineService.record(
                claim,
                ClaimStage.COMPLETED,
                ClaimStatus.PAID,
                "Carrier approved payment. Claim lifecycle completed." + notes
        );

        return buildReviewDetails(claim);
    }

    @Transactional
    public CarrierClaimReviewDetailsResponse rejectClaim(
            UUID claimId,
            CarrierDecisionRequest request,
            TpaUserPrincipal principal
    ) {
        Claim claim = loadPendingCarrierClaim(claimId);

        if (request == null || request.reviewerNotes() == null || request.reviewerNotes().isBlank()) {
            throw new ValidationException("Rejection notes are required.");
        }

        claim.setStatus(ClaimStatus.REJECTED);
        claim.setStage(ClaimStage.COMPLETED);
        claim.setUpdatedBy(principal.getEmail());
        claimRepository.save(claim);

        claimTimelineService.record(
                claim,
                ClaimStage.COMPLETED,
                ClaimStatus.REJECTED,
                "Carrier rejected the claim. Reason: " + request.reviewerNotes()
        );

        return buildReviewDetails(claim);
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

    // ── Private Helpers ─────────────────────────────────────────────────

    private Claim loadClaim(UUID claimId) {
        return claimRepository.findByIdWithReviewDetails(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found."));
    }

    private Claim loadPendingCarrierClaim(UUID claimId) {
        Claim claim = loadClaim(claimId);
        if (claim.getStatus() != ClaimStatus.UNDER_REVIEW || claim.getStage() != ClaimStage.CARRIER_REVIEW) {
            throw new ValidationException("This claim is not pending Carrier review.");
        }
        return claim;
    }

    private CarrierClaimReviewDetailsResponse buildReviewDetails(Claim claim) {
        List<ClaimDocumentResponse> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claim.getId()).stream()
                .map(claimResponseMapper::toClaimDocumentResponse)
                .toList();

        ExtractedClaimDataResponse extractedData = claim.getExtractedClaimData() == null
                ? null
                : claimResponseMapper.toExtractedClaimDataResponse(claim.getExtractedClaimData());

        FmgClaimDecisionResponse decisionResponse = fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claim.getId())
                .map(this::toDecisionResponse)
                .orElse(null);
                
        FmgManualReviewResponse manualReviewResponse = fmgManualReviewRepository.findByClaimId(claim.getId())
                .map(this::toManualReviewResponse)
                .orElse(null);
                
        List<TimelineEntryDto> timeline = claimTimelineService.getClaimTimeline(claim.getId());

        return new CarrierClaimReviewDetailsResponse(
                claimResponseMapper.toClaimResponse(claim),
                documents,
                extractedData,
                decisionResponse,
                manualReviewResponse,
                timeline
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
}
