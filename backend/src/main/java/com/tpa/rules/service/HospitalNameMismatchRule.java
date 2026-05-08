package com.tpa.rules.service;

import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

@Component
public class HospitalNameMismatchRule extends AbstractFmgClaimRule {

    private final ClientClaimMatchService clientClaimMatchService;

    public HospitalNameMismatchRule(ClientClaimMatchService clientClaimMatchService) {
        this.clientClaimMatchService = clientClaimMatchService;
    }

    @Override
    public int order() {
        return 6;
    }

    @Override
    public String code() {
        return "RULE_6";
    }

    @Override
    public String name() {
        return "Hospital name mismatch";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        String claimFormHospitalName = context.claimFormHospitalName();
        String hospitalDocumentHospitalName = context.hospitalDocumentHospitalName();
        boolean mismatch = clientClaimMatchService.hasText(claimFormHospitalName)
                && clientClaimMatchService.hasText(hospitalDocumentHospitalName)
                && !clientClaimMatchService.normalizeText(claimFormHospitalName)
                .equals(clientClaimMatchService.normalizeText(hospitalDocumentHospitalName));

        return mismatch
                ? trigger(String.format(
                "Hospital name mismatch detected between claim form (%s) and hospital document (%s).",
                claimFormHospitalName.trim(),
                hospitalDocumentHospitalName.trim()
        ))
                : noTrigger();
    }
}
