package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ClaimedAmountExceedsBillAmountRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 8;
    }

    @Override
    public String code() {
        return "RULE_8";
    }

    @Override
    public String name() {
        return "Claimed amount exceeds bill amount";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        BigDecimal claimedAmount = context.claimedAmount();
        BigDecimal billAmount = context.billAmount();
        boolean exceedsBillAmount = claimedAmount != null
                && billAmount != null
                && claimedAmount.compareTo(billAmount) > 0;

        return exceedsBillAmount
                ? trigger("Claimed amount " + claimedAmount + " is greater than bill amount " + billAmount + ".")
                : noTrigger();
    }
}
