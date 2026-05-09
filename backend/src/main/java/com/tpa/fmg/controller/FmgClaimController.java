package com.tpa.fmg.controller;

import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.common.ApiResponse;
import com.tpa.fmg.dto.FmgConfirmDecisionRequest;
import com.tpa.fmg.dto.FmgClaimReviewDetailsResponse;
import com.tpa.fmg.dto.FmgManualReviewRequest;
import com.tpa.fmg.service.FmgClaimReviewService;
import com.tpa.security.TpaUserPrincipal;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/fmg/claims")
public class FmgClaimController {

    private final FmgClaimReviewService fmgClaimReviewService;

    public FmgClaimController(FmgClaimReviewService fmgClaimReviewService) {
        this.fmgClaimReviewService = fmgClaimReviewService;
    }

    @GetMapping
    public ApiResponse<List<ClaimResponse>> getReviewQueue() {
        return ApiResponse.success("FMG review queue loaded.", fmgClaimReviewService.getReviewQueue());
    }

    @GetMapping("/history")
    public ApiResponse<List<ClaimResponse>> getHistoryQueue() {
        return ApiResponse.success("FMG processed history loaded.", fmgClaimReviewService.getHistoryQueue());
    }

    @GetMapping("/{claimId}")
    public ApiResponse<FmgClaimReviewDetailsResponse> getClaimDetails(@PathVariable UUID claimId) {
        return ApiResponse.success("FMG claim review details loaded.", fmgClaimReviewService.getClaimDetails(claimId));
    }

    @PostMapping("/{claimId}/evaluate")
    public ApiResponse<FmgClaimReviewDetailsResponse> evaluateClaim(
            @PathVariable UUID claimId,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        FmgClaimReviewDetailsResponse response = fmgClaimReviewService.evaluateClaim(claimId, principal);
        return ApiResponse.success("FMG rule evaluation completed.", response);
    }

    @PostMapping("/{claimId}/confirm")
    public ApiResponse<FmgClaimReviewDetailsResponse> confirmDecision(
            @PathVariable UUID claimId,
            @RequestBody FmgConfirmDecisionRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        FmgClaimReviewDetailsResponse response = fmgClaimReviewService.confirmDecision(claimId, request, principal);
        return ApiResponse.success("FMG decision confirmed successfully.", response);
    }

    @GetMapping("/{claimId}/documents/{documentId}/view")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable UUID claimId,
            @PathVariable UUID documentId
    ) {
        ClaimDocument document = fmgClaimReviewService.getDocument(claimId, documentId);
        byte[] content = fmgClaimReviewService.getDocumentContent(document.getStoredFilePath());
        String mimeType = fmgClaimReviewService.getDocumentMimeType(document.getStoredFileName());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);
    }

    // ── Manual Review Endpoints ─────────────────────────────────────────

    @GetMapping("/manual-review")
    public ApiResponse<List<ClaimResponse>> getManualReviewQueue() {
        return ApiResponse.success("FMG manual review queue loaded.", fmgClaimReviewService.getManualReviewQueue());
    }

    @GetMapping("/{claimId}/manual-review")
    public ApiResponse<FmgClaimReviewDetailsResponse> getManualReviewDetails(@PathVariable UUID claimId) {
        return ApiResponse.success("FMG manual review details loaded.", fmgClaimReviewService.getManualReviewDetails(claimId));
    }

    @PostMapping("/{claimId}/manual-review")
    public ApiResponse<FmgClaimReviewDetailsResponse> submitManualReview(
            @PathVariable UUID claimId,
            @RequestBody FmgManualReviewRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        FmgClaimReviewDetailsResponse response = fmgClaimReviewService.submitManualReview(claimId, request, principal);
        return ApiResponse.success("FMG manual review submitted successfully.", response);
    }
}
