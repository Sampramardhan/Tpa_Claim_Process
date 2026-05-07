package com.tpa.ocr.dto;

public record ClaimOcrClientResponse(
        ClaimOcrExtractionResult extractionResult,
        String rawResponse
) {
}
