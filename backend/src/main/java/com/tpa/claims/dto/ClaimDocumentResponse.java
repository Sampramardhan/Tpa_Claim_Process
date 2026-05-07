package com.tpa.claims.dto;

import com.tpa.claims.enums.ClaimDocumentType;

import java.time.LocalDateTime;
import java.util.UUID;

public record ClaimDocumentResponse(
        UUID id,
        UUID claimId,
        ClaimDocumentType documentType,
        String originalFileName,
        String storedFileName,
        String storedFilePath,
        LocalDateTime uploadedAt
) {
}
