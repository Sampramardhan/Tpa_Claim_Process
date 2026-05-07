package com.tpa.policies.dto;

import com.tpa.common.enums.PolicyType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PolicyVerificationResponse(
        UUID id,
        String uniquePolicyNumber,
        String customerName,
        String customerEmail,
        UUID customerId,
        String policyName,
        PolicyType policyType,
        BigDecimal coverageAmount,
        String carrierName,
        LocalDate purchaseDate,
        LocalDate expiryDate,
        boolean active
) {
}
