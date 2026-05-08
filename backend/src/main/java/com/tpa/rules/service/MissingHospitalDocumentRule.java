package com.tpa.rules.service;

import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

@Component
public class MissingHospitalDocumentRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 2;
    }

    @Override
    public String code() {
        return "RULE_2";
    }

    @Override
    public String name() {
        return "Missing hospital document";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.REJECT;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        return context.hasDocument(ClaimDocumentType.HOSPITAL_DOCUMENT)
                ? noTrigger()
                : trigger("Hospital document is missing.");
    }
}
