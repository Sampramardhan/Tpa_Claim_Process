package com.tpa.fmg.dto;

import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.client.dto.ClientClaimValidationResponse;
import com.tpa.timeline.dto.TimelineEntryDto;

import java.util.List;

public record FmgClaimReviewDetailsResponse(
        ClaimResponse claim,
        List<ClaimDocumentResponse> documents,
        ExtractedClaimDataResponse extractedData,
        ClientClaimValidationResponse clientValidation,
        FmgClaimDecisionResponse fmgDecision,
        FmgManualReviewResponse manualReview,
        List<TimelineEntryDto> timeline
) {
}
