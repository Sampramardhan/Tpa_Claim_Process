package com.tpa.ocr.dto;

public record ClaimOcrClientResponse(
        ClaimOcrExtractionResult mergedExtractionResult,
        ClaimOcrExtractionResult claimFormExtractionResult,
        ClaimOcrExtractionResult hospitalDocumentExtractionResult,
        String rawResponse
) {
}
