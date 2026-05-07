package com.tpa.claims.dto;

import java.util.List;

public record ClaimDetailsResponse(
        ClaimResponse claim,
        List<ClaimDocumentResponse> documents,
        ExtractedClaimDataResponse extractedData
) {
}
