package com.tpa.carrier.controller;

import com.tpa.carrier.dto.CarrierClaimReviewDetailsResponse;
import com.tpa.carrier.dto.CarrierDecisionRequest;
import com.tpa.carrier.service.CarrierClaimReviewService;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.common.ApiResponse;
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
@RequestMapping("/carrier/claims")
public class CarrierClaimController {

    private final CarrierClaimReviewService carrierClaimReviewService;

    public CarrierClaimController(CarrierClaimReviewService carrierClaimReviewService) {
        this.carrierClaimReviewService = carrierClaimReviewService;
    }

    @GetMapping
    public ApiResponse<List<ClaimResponse>> getReviewQueue() {
        return ApiResponse.success("Carrier review queue loaded.", carrierClaimReviewService.getReviewQueue());
    }

    @GetMapping("/history")
    public ApiResponse<List<ClaimResponse>> getHistoryQueue() {
        return ApiResponse.success("Carrier settlement history loaded.", carrierClaimReviewService.getHistoryQueue());
    }

    @GetMapping("/{claimId}")
    public ApiResponse<CarrierClaimReviewDetailsResponse> getClaimDetails(@PathVariable UUID claimId) {
        return ApiResponse.success("Carrier claim review details loaded.", carrierClaimReviewService.getClaimDetails(claimId));
    }

    @PostMapping("/{claimId}/approve")
    public ApiResponse<CarrierClaimReviewDetailsResponse> approvePayment(
            @PathVariable UUID claimId,
            @RequestBody(required = false) CarrierDecisionRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        CarrierClaimReviewDetailsResponse response = carrierClaimReviewService.approvePayment(claimId, request, principal);
        return ApiResponse.success("Carrier approved payment successfully.", response);
    }

    @PostMapping("/{claimId}/reject")
    public ApiResponse<CarrierClaimReviewDetailsResponse> rejectClaim(
            @PathVariable UUID claimId,
            @RequestBody CarrierDecisionRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        CarrierClaimReviewDetailsResponse response = carrierClaimReviewService.rejectClaim(claimId, request, principal);
        return ApiResponse.success("Carrier rejected claim successfully.", response);
    }

    @GetMapping("/{claimId}/documents/{documentId}/view")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable UUID claimId,
            @PathVariable UUID documentId
    ) {
        ClaimDocument document = carrierClaimReviewService.getDocument(claimId, documentId);
        byte[] content = carrierClaimReviewService.getDocumentContent(document.getStoredFilePath());
        String mimeType = carrierClaimReviewService.getDocumentMimeType(document.getStoredFileName());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);
    }
}
