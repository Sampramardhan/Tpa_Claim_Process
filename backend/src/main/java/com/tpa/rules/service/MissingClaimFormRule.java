package com.tpa.rules.service;

import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

@Component
public class MissingClaimFormRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 1;
    }

    @Override
    public String code() {
        return "RULE_1";
    }

    @Override
    public String name() {
        return "Missing claim form";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.REJECT;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        return context.hasDocument(ClaimDocumentType.CLAIM_FORM)
                ? noTrigger()
                : trigger("Claim form document is missing.");
    }
}
