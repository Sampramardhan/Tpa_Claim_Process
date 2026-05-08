package com.tpa.claims.dto;

import com.tpa.timeline.dto.TimelineEntryDto;

import java.util.List;

public record ClaimDetailsResponse(
        ClaimResponse claim,
        List<ClaimDocumentResponse> documents,
        ExtractedClaimDataResponse extractedData,
        List<TimelineEntryDto> timeline
) {
}
