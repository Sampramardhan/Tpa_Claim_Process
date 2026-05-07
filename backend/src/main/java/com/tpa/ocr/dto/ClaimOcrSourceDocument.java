package com.tpa.ocr.dto;

import com.tpa.claims.enums.ClaimDocumentType;

public record ClaimOcrSourceDocument(
        ClaimDocumentType documentType,
        String originalFileName,
        String storedFileName,
        String mimeType,
        byte[] fileBytes
) {
}
