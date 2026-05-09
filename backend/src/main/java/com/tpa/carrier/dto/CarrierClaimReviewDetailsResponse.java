package com.tpa.carrier.dto;

import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.fmg.dto.FmgClaimDecisionResponse;
import com.tpa.fmg.dto.FmgManualReviewResponse;
import com.tpa.timeline.dto.TimelineEntryDto;

import java.util.List;

public record CarrierClaimReviewDetailsResponse(
        ClaimResponse claim,
        List<ClaimDocumentResponse> documents,
        ExtractedClaimDataResponse extractedData,
        FmgClaimDecisionResponse fmgDecision,
        FmgManualReviewResponse manualReview,
        List<TimelineEntryDto> timeline
) {
}
