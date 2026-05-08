package com.tpa.rules.service;

import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

@Component
public class MissingPolicyNumberRule extends AbstractFmgClaimRule {

    private final ClientClaimMatchService clientClaimMatchService;

    public MissingPolicyNumberRule(ClientClaimMatchService clientClaimMatchService) {
        this.clientClaimMatchService = clientClaimMatchService;
    }

    @Override
    public int order() {
        return 4;
    }

    @Override
    public String code() {
        return "RULE_4";
    }

    @Override
    public String name() {
        return "Policy number missing";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        return clientClaimMatchService.hasText(context.policyNumber())
                ? noTrigger()
                : trigger("Policy number is missing from the extracted claim data.");
    }
}
