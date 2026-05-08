package com.tpa.client.dto;

import com.tpa.client.enums.ClientReviewDecision;
import com.tpa.client.enums.ClientValidationStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ClientClaimValidationResponse(
        UUID id,
        ClientValidationStatus validationStatus,
        ClientReviewDecision reviewDecision,
        LocalDateTime validatedAt,
        String validatedBy,
        String rejectionReason,
        List<ValidationCheckResponse> checks
) {
}
