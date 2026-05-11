package com.tpa.claims.controller;

import com.tpa.claims.dto.ClaimDetailsResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.CreateClaimUploadRequest;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.dto.UpdateExtractedClaimDataRequest;
import com.tpa.claims.service.ClaimService;
import com.tpa.common.ApiResponse;
import com.tpa.security.TpaUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import com.tpa.claims.entity.ClaimDocument;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/customer/claims")
public class CustomerClaimController {

    private final ClaimService claimService;
    private final com.tpa.claims.service.ClaimReportPdfService claimReportPdfService;

    public CustomerClaimController(ClaimService claimService, com.tpa.claims.service.ClaimReportPdfService claimReportPdfService) {
        this.claimService = claimService;
        this.claimReportPdfService = claimReportPdfService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ClaimResponse> createClaim(
            @Valid @ModelAttribute CreateClaimUploadRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success("Claim created and documents uploaded successfully.", claimService.createClaim(request, principal));
    }

    @GetMapping
    public ApiResponse<List<ClaimResponse>> getMyClaims(
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success("Customer claims loaded.", claimService.getMyClaims(principal));
    }

    @GetMapping("/{claimId}")
    public ApiResponse<ClaimDetailsResponse> getMyClaim(
            @PathVariable UUID claimId,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success("Claim details loaded.", claimService.getMyClaim(claimId, principal));
    }

    @PostMapping("/{claimId}/submit")
    public ApiResponse<ClaimResponse> submitMyClaim(
            @PathVariable UUID claimId,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Claim submitted successfully.",
                claimService.submitMyClaim(claimId, principal)
        );
    }

    @PutMapping("/{claimId}/extracted-data")
    public ApiResponse<ExtractedClaimDataResponse> updateMyClaimExtractedData(
            @PathVariable UUID claimId,
            @RequestBody UpdateExtractedClaimDataRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Extracted claim data updated successfully.",
                claimService.updateMyClaimExtractedData(claimId, request, principal)
        );
    }

    @GetMapping("/{claimId}/documents/{documentId}/view")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable UUID claimId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        ClaimDocument document = claimService.getDocument(claimId, documentId, principal);
        byte[] content = claimService.getDocumentContent(document.getStoredFilePath());
        String mimeType = claimService.getDocumentMimeType(document.getStoredFileName());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(content);
    }

    @GetMapping("/{claimId}/report")
    public ResponseEntity<byte[]> downloadClaimReport(
            @PathVariable UUID claimId,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        byte[] pdfBytes = claimReportPdfService.generateClaimReport(claimId, principal.getId());
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "CLM-" + claimId.toString().substring(0, 8) + "-Report.pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }
}
