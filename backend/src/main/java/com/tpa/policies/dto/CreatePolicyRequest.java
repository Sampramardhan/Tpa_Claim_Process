package com.tpa.policies.dto;

import com.tpa.common.enums.PolicyType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreatePolicyRequest(

        @NotBlank(message = "Policy name is required.")
        String policyName,

        @NotNull(message = "Policy type is required.")
        PolicyType policyType,

        String description,

        @NotNull(message = "Coverage amount is required.")
        @Positive(message = "Coverage amount must be positive.")
        BigDecimal coverageAmount,

        @NotNull(message = "Premium amount is required.")
        @Positive(message = "Premium amount must be positive.")
        BigDecimal premiumAmount,

        @Min(value = 0, message = "Waiting period cannot be negative.")
        int waitingPeriodDays,

        @Min(value = 1, message = "Policy duration must be at least 1 month.")
        int policyDurationMonths,

        @NotBlank(message = "Carrier name is required.")
        String carrierName,

        @NotBlank(message = "Carrier code is required.")
        @Size(min = 2, max = 10, message = "Carrier code must be 2-10 characters.")
        String carrierCode
) {
}
