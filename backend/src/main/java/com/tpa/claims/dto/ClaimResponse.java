package com.tpa.claims.dto;

import com.tpa.claims.enums.OcrStatus;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ClaimResponse(
        UUID id,
        String claimNumber,
        UUID customerId,
        UUID customerPolicyId,
        String customerPolicyNumber,
        String policyName,
        String carrierName,
        OcrStatus ocrStatus,
        ClaimStatus status,
        ClaimStage stage,
        LocalDateTime submissionDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
