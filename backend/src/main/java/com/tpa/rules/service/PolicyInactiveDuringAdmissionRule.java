package com.tpa.rules.service;

import com.tpa.policies.entity.CustomerPolicy;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class PolicyInactiveDuringAdmissionRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 3;
    }

    @Override
    public String code() {
        return "RULE_3";
    }

    @Override
    public String name() {
        return "Policy inactive during admission date";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.REJECT;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        LocalDate admissionDate = context.resolvedAdmissionDate();
        CustomerPolicy policy = context.claim().getCustomerPolicy();
        if (admissionDate == null || policy == null) {
            return noTrigger();
        }

        boolean inactive = !policy.isActive()
                || admissionDate.isBefore(policy.getPurchaseDate())
                || admissionDate.isAfter(policy.getExpiryDate());

        return inactive
                ? trigger("Policy was inactive on admission date " + admissionDate + ".")
                : noTrigger();
    }
}
