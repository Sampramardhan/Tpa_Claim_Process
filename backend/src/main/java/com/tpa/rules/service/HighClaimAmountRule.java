package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class HighClaimAmountRule extends AbstractFmgClaimRule {

    private static final BigDecimal MANUAL_REVIEW_THRESHOLD = new BigDecimal("50000.00");

    @Override
    public int order() {
        return 9;
    }

    @Override
    public String code() {
        return "RULE_9";
    }

    @Override
    public String name() {
        return "Claim amount exceeds threshold";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        BigDecimal claimedAmount = context.claimedAmount();
        boolean exceedsThreshold = claimedAmount != null
                && claimedAmount.compareTo(MANUAL_REVIEW_THRESHOLD) > 0;

        return exceedsThreshold
                ? trigger("Claimed amount " + claimedAmount + " exceeds the automatic approval threshold of 50000.")
                : noTrigger();
    }
}
