package com.tpa.client.controller;

import com.tpa.claims.entity.ClaimDocument;
import com.tpa.client.dto.ClientClaimRejectRequest;
import com.tpa.client.dto.ClientClaimReviewDetailsResponse;
import com.tpa.client.dto.ClientClaimValidationResponse;
import com.tpa.client.service.ClientClaimReviewService;
import com.tpa.claims.dto.ClaimResponse;
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
@RequestMapping("/client/claims")
public class ClientClaimController {

    private final ClientClaimReviewService clientClaimReviewService;

    public ClientClaimController(ClientClaimReviewService clientClaimReviewService) {
        this.clientClaimReviewService = clientClaimReviewService;
    }

    @GetMapping
    public ApiResponse<List<ClaimResponse>> getClientReviewQueue() {
        return ApiResponse.success("Client review queue loaded.", clientClaimReviewService.getReviewQueue());
    }

    @GetMapping("/history")
    public ApiResponse<List<ClaimResponse>> getClientHistoryQueue() {
        return ApiResponse.success("Client processed history loaded.", clientClaimReviewService.getHistoryQueue());
    }

    @GetMapping("/{claimId}")
    public ApiResponse<ClientClaimReviewDetailsResponse> getClaimDetails(@PathVariable UUID claimId) {
        return ApiResponse.success("Claim review details loaded.", clientClaimReviewService.getClaimDetails(claimId));
    }

    // Endpoints removed for automatic client review

    @GetMapping("/{claimId}/documents/{documentId}/view")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable UUID claimId,
            @PathVariable UUID documentId
    ) {
        ClaimDocument document = clientClaimReviewService.getDocument(claimId, documentId);
        byte[] content = clientClaimReviewService.getDocumentContent(document.getStoredFilePath());
        String mimeType = clientClaimReviewService.getDocumentMimeType(document.getStoredFileName());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);
    }
}
