package com.tpa.fmg.dto;

import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record FmgClaimDecisionResponse(
        UUID id,
        ClaimStatus recommendedDecision,
        ClaimStatus statusAfterDecision,
        ClaimStage stageAfterDecision,
        LocalDateTime evaluatedAt,
        String evaluatedBy,
        ClaimStatus finalDecision,
        LocalDateTime confirmedAt,
        String confirmedBy,
        boolean confirmed,
        List<FmgRuleTriggerResponse> triggeredRules
) {
}
