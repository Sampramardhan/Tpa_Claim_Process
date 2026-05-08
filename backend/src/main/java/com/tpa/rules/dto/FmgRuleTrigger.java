package com.tpa.rules.dto;

public record FmgRuleTrigger(
        String code,
        String name,
        int order,
        RuleOutcome outcome,
        String message
) {
}
