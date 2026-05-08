package com.tpa.fmg.dto;

import com.tpa.rules.dto.RuleOutcome;

public record FmgRuleTriggerResponse(
        String code,
        String name,
        int order,
        RuleOutcome outcome,
        String message
) {
}
