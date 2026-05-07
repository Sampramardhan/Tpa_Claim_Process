package com.tpa.policies.dto;

import com.tpa.common.enums.PolicyType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record CustomerPolicyResponse(
        UUID id,
        String uniquePolicyNumber,
        String policyName,
        PolicyType policyType,
        String description,
        BigDecimal coverageAmount,
        BigDecimal premiumAmount,
        String carrierName,
        LocalDate purchaseDate,
        LocalDate expiryDate,
        boolean active,
        LocalDateTime createdAt
) {
}
