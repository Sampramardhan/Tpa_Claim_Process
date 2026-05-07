package com.tpa.policies.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PurchasePolicyRequest(

        @NotNull(message = "Policy ID is required.")
        UUID policyId
) {
}
