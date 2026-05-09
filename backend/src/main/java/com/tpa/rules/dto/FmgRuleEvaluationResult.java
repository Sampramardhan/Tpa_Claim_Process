package com.tpa.rules.dto;

import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;

import java.util.List;

public record FmgRuleEvaluationResult(
        ClaimStatus decision,
        List<FmgRuleTrigger> triggeredRules
) {

    public FmgRuleEvaluationResult {
        triggeredRules = List.copyOf(triggeredRules);
    }

    public ClaimStatus resultingStatus() {
        return decision == ClaimStatus.APPROVED ? ClaimStatus.UNDER_REVIEW : decision;
    }

    public ClaimStage resultingStage() {
        return switch (decision) {
            case APPROVED -> ClaimStage.CARRIER_REVIEW;
            case REJECTED -> ClaimStage.COMPLETED;
            case MANUAL_REVIEW -> ClaimStage.FMG_MANUAL_REVIEW;
            default -> throw new IllegalStateException("Unsupported FMG decision: " + decision);
        };
    }
}
