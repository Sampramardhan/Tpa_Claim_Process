package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class PossibleDuplicateClaimRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 10;
    }

    @Override
    public String code() {
        return "RULE_10";
    }

    @Override
    public String name() {
        return "Possible duplicate claim";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        return context.possibleDuplicateClaimNumbers().isEmpty()
                ? noTrigger()
                : trigger("Possible duplicate claim detected against "
                + context.possibleDuplicateClaimNumbers().stream().collect(Collectors.joining(", "))
                + ".");
    }
}
