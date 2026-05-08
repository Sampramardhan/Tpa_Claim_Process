package com.tpa.client.dto;

import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.timeline.dto.TimelineEntryDto;

import java.util.List;

public record ClientClaimReviewDetailsResponse(
        ClaimResponse claim,
        List<ClaimDocumentResponse> documents,
        ExtractedClaimDataResponse extractedData,
        ClientClaimValidationResponse validation,
        List<TimelineEntryDto> timeline
) {
}
