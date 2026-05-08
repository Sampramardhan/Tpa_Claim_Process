package com.tpa.rules.service;

import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

@Component
public class CustomerIdentityMismatchRule extends AbstractFmgClaimRule {

    private final ClientClaimMatchService clientClaimMatchService;

    public CustomerIdentityMismatchRule(ClientClaimMatchService clientClaimMatchService) {
        this.clientClaimMatchService = clientClaimMatchService;
    }

    @Override
    public int order() {
        return 5;
    }

    @Override
    public String code() {
        return "RULE_5";
    }

    @Override
    public String name() {
        return "Patient or customer mismatch across sources";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        String registeredCustomerName = context.registeredCustomerName();
        String claimFormIdentity = context.claimFormIdentityName();
        String hospitalDocumentIdentity = context.hospitalDocumentIdentityName();

        boolean mismatch = pairMismatches(claimFormIdentity, hospitalDocumentIdentity)
                || pairMismatches(claimFormIdentity, registeredCustomerName)
                || pairMismatches(hospitalDocumentIdentity, registeredCustomerName);

        return mismatch
                ? trigger(String.format(
                "Identity mismatch detected across claim form (%s), hospital document (%s), and registered customer (%s).",
                displayValue(claimFormIdentity),
                displayValue(hospitalDocumentIdentity),
                displayValue(registeredCustomerName)
        ))
                : noTrigger();
    }

    private boolean pairMismatches(String left, String right) {
        return clientClaimMatchService.hasText(left)
                && clientClaimMatchService.hasText(right)
                && !clientClaimMatchService.normalizeText(left)
                .equals(clientClaimMatchService.normalizeText(right));
    }

    private String displayValue(String value) {
        return clientClaimMatchService.hasText(value) ? value.trim() : "N/A";
    }
}
