package com.tpa.policies.dto;

import com.tpa.common.enums.PolicyType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PolicyResponse(
        UUID id,
        String policyName,
        PolicyType policyType,
        String description,
        BigDecimal coverageAmount,
        BigDecimal premiumAmount,
        int waitingPeriodDays,
        int policyDurationMonths,
        boolean active,
        String carrierName,
        String carrierCode,
        UUID carrierId,
        long enrolledCount,
        LocalDateTime createdAt
) {
}
