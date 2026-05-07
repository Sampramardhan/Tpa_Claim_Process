package com.tpa.claims.dto;

import com.tpa.claims.enums.ClaimDocumentType;

import java.time.LocalDateTime;

public record StoredClaimFile(
        ClaimDocumentType documentType,
        String originalFileName,
        String storedFileName,
        String storedFilePath,
        LocalDateTime uploadedAt
) {
}
