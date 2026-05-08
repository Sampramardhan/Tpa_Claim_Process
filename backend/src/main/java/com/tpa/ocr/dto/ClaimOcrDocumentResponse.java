package com.tpa.ocr.dto;

public record ClaimOcrDocumentResponse(
        ClaimOcrExtractionResult extractionResult,
        String rawResponse
) {
}
