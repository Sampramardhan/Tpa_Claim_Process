package com.tpa.fmg.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.service.ClaimFileStorageService;
import com.tpa.claims.service.ClaimResponseMapper;
import com.tpa.client.entity.ClientClaimValidation;
import com.tpa.client.enums.ClientReviewDecision;
import com.tpa.client.enums.ClientValidationStatus;
import com.tpa.client.repository.ClientClaimValidationRepository;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.common.enums.UserRole;
import com.tpa.fmg.dto.FmgConfirmDecisionRequest;
import com.tpa.fmg.entity.FmgClaimDecision;
import com.tpa.fmg.repository.FmgClaimDecisionRepository;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.FmgRuleEvaluationResult;
import com.tpa.rules.dto.FmgRuleTrigger;
import com.tpa.rules.dto.RuleOutcome;
import com.tpa.rules.service.FmgRuleContextFactory;
import com.tpa.rules.service.FmgRuleEngineService;
import com.tpa.security.TpaUserPrincipal;
import com.tpa.timeline.service.ClaimTimelineService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FmgClaimReviewServiceTests {

    @Test
    void evaluateClaimPersistsRecommendedDecisionWithoutChangingClaimStage() {
        ClaimRepository claimRepository = mock(ClaimRepository.class);
        ClaimDocumentRepository claimDocumentRepository = mock(ClaimDocumentRepository.class);
        ClientClaimValidationRepository clientClaimValidationRepository = mock(ClientClaimValidationRepository.class);
        FmgClaimDecisionRepository fmgClaimDecisionRepository = mock(FmgClaimDecisionRepository.class);
        ClaimFileStorageService claimFileStorageService = mock(ClaimFileStorageService.class);
        ClaimResponseMapper claimResponseMapper = mock(ClaimResponseMapper.class);
        ClaimTimelineService claimTimelineService = mock(ClaimTimelineService.class);
        FmgRuleContextFactory fmgRuleContextFactory = mock(FmgRuleContextFactory.class);
        FmgRuleEngineService fmgRuleEngineService = mock(FmgRuleEngineService.class);

        FmgClaimReviewService service = new FmgClaimReviewService(
                claimRepository,
                claimDocumentRepository,
                clientClaimValidationRepository,
                fmgClaimDecisionRepository,
                claimFileStorageService,
                claimResponseMapper,
                claimTimelineService,
                fmgRuleContextFactory,
                fmgRuleEngineService,
                new ObjectMapper()
        );

        UUID claimId = UUID.randomUUID();
        Claim claim = claim(claimId, ClaimStatus.UNDER_REVIEW, ClaimStage.FMG_REVIEW);
        ClientClaimValidation validation = validation(claim);
        AtomicReference<FmgClaimDecision> savedDecision = new AtomicReference<>();
        FmgRuleEvaluationResult evaluationResult = new FmgRuleEvaluationResult(
                ClaimStatus.MANUAL_REVIEW,
                List.of(new FmgRuleTrigger("RULE_5", "Identity mismatch", 5, RuleOutcome.MANUAL_REVIEW, "Mismatch"))
        );

        when(claimRepository.findByIdWithReviewDetails(claimId)).thenReturn(Optional.of(claim));
        when(clientClaimValidationRepository.findByClaim_Id(claimId)).thenReturn(Optional.of(validation));
        when(claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId)).thenReturn(List.of());
        when(fmgRuleContextFactory.create(eq(claim), any())).thenReturn(new FmgRuleContext(claim, null, java.util.Set.of(), null, List.of()));
        when(fmgRuleEngineService.evaluate(any())).thenReturn(evaluationResult);
        when(fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claimId)).thenAnswer(invocation ->
                Optional.ofNullable(savedDecision.get())
        );
        when(fmgClaimDecisionRepository.save(any(FmgClaimDecision.class))).thenAnswer(invocation -> {
            FmgClaimDecision decision = invocation.getArgument(0);
            savedDecision.set(decision);
            return decision;
        });
        when(claimResponseMapper.toClaimResponse(any())).thenReturn(claimResponse(claimId, ClaimStatus.UNDER_REVIEW, ClaimStage.FMG_REVIEW));
        when(claimTimelineService.getClaimTimeline(claimId)).thenReturn(List.of());

        service.evaluateClaim(claimId, principal());

        assertEquals(ClaimStatus.UNDER_REVIEW, claim.getStatus());
        assertEquals(ClaimStage.FMG_REVIEW, claim.getStage());
        assertNotNull(savedDecision.get());
        assertEquals(ClaimStatus.MANUAL_REVIEW, savedDecision.get().getRecommendedDecision());
        assertNull(savedDecision.get().getFinalDecision());
        assertEquals("fmg@example.com", savedDecision.get().getEvaluatedBy());
        verify(claimRepository, never()).save(any(Claim.class));
        verify(claimTimelineService).record(
                eq(claim),
                eq(ClaimStage.FMG_REVIEW),
                eq(ClaimStatus.UNDER_REVIEW),
                any(String.class)
        );
    }

    @Test
    void confirmDecisionUpdatesClaimStageAndPersistsFinalDecision() {
        ClaimRepository claimRepository = mock(ClaimRepository.class);
        ClaimDocumentRepository claimDocumentRepository = mock(ClaimDocumentRepository.class);
        ClientClaimValidationRepository clientClaimValidationRepository = mock(ClientClaimValidationRepository.class);
        FmgClaimDecisionRepository fmgClaimDecisionRepository = mock(FmgClaimDecisionRepository.class);
        ClaimFileStorageService claimFileStorageService = mock(ClaimFileStorageService.class);
        ClaimResponseMapper claimResponseMapper = mock(ClaimResponseMapper.class);
        ClaimTimelineService claimTimelineService = mock(ClaimTimelineService.class);
        FmgRuleContextFactory fmgRuleContextFactory = mock(FmgRuleContextFactory.class);
        FmgRuleEngineService fmgRuleEngineService = mock(FmgRuleEngineService.class);

        FmgClaimReviewService service = new FmgClaimReviewService(
                claimRepository,
                claimDocumentRepository,
                clientClaimValidationRepository,
                fmgClaimDecisionRepository,
                claimFileStorageService,
                claimResponseMapper,
                claimTimelineService,
                fmgRuleContextFactory,
                fmgRuleEngineService,
                new ObjectMapper()
        );

        UUID claimId = UUID.randomUUID();
        Claim claim = claim(claimId, ClaimStatus.UNDER_REVIEW, ClaimStage.FMG_REVIEW);
        ClientClaimValidation validation = validation(claim);
        FmgClaimDecision decision = FmgClaimDecision.builder()
                .claim(claim)
                .recommendedDecision(ClaimStatus.APPROVED)
                .statusAfterDecision(ClaimStatus.APPROVED)
                .stageAfterDecision(ClaimStage.CARRIER_REVIEW)
                .evaluatedAt(LocalDateTime.now())
                .evaluatedBy("fmg@example.com")
                .build();

        when(claimRepository.findByIdWithReviewDetails(claimId)).thenReturn(Optional.of(claim));
        when(clientClaimValidationRepository.findByClaim_Id(claimId)).thenReturn(Optional.of(validation));
        when(fmgClaimDecisionRepository.findByClaimIdWithTriggeredRules(claimId)).thenReturn(Optional.of(decision));
        when(fmgClaimDecisionRepository.save(any(FmgClaimDecision.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId)).thenReturn(List.of());
        when(claimResponseMapper.toClaimResponse(any())).thenReturn(claimResponse(claimId, ClaimStatus.APPROVED, ClaimStage.CARRIER_REVIEW));
        when(claimTimelineService.getClaimTimeline(claimId)).thenReturn(List.of());

        service.confirmDecision(claimId, new FmgConfirmDecisionRequest(ClaimStatus.APPROVED), principal());

        assertEquals(ClaimStatus.APPROVED, claim.getStatus());
        assertEquals(ClaimStage.CARRIER_REVIEW, claim.getStage());
        assertEquals(ClaimStatus.APPROVED, decision.getFinalDecision());
        assertEquals("fmg@example.com", decision.getConfirmedBy());
        verify(claimRepository).save(claim);
        verify(claimTimelineService).record(
                eq(claim),
                eq(ClaimStage.CARRIER_REVIEW),
                eq(ClaimStatus.APPROVED),
                any(String.class)
        );
    }

    private Claim claim(UUID claimId, ClaimStatus status, ClaimStage stage) {
        Claim claim = Claim.builder()
                .id(claimId)
                .claimNumber("CLM-2026-0001")
                .status(status)
                .stage(stage)
                .build();
        return claim;
    }

    private ClientClaimValidation validation(Claim claim) {
        ClientClaimValidation validation = ClientClaimValidation.builder()
                .claim(claim)
                .validationStatus(ClientValidationStatus.PASSED)
                .reviewDecision(ClientReviewDecision.FORWARDED_TO_FMG)
                .validatedAt(LocalDateTime.now())
                .validatedBy("client@example.com")
                .validationResultJson("[]")
                .build();
        return validation;
    }

    private ClaimResponse claimResponse(UUID claimId, ClaimStatus status, ClaimStage stage) {
        return new ClaimResponse(
                claimId,
                "CLM-2026-0001",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                status,
                stage,
                null,
                null,
                null
        );
    }

    private TpaUserPrincipal principal() {
        return new TpaUserPrincipal(
                UUID.randomUUID(),
                "FMG Reviewer",
                "fmg@example.com",
                "secret",
                UserRole.FMG,
                true
        );
    }
}
