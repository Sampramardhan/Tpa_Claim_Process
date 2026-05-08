package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class AdmissionDischargeDateMismatchRule extends AbstractFmgClaimRule {

    @Override
    public int order() {
        return 7;
    }

    @Override
    public String code() {
        return "RULE_7";
    }

    @Override
    public String name() {
        return "Admission or discharge date mismatch";
    }

    @Override
    public RuleOutcome outcome() {
        return RuleOutcome.MANUAL_REVIEW;
    }

    @Override
    public java.util.Optional<com.tpa.rules.dto.FmgRuleTrigger> evaluate(FmgRuleContext context) {
        LocalDate claimFormAdmissionDate = context.claimFormAdmissionDate();
        LocalDate hospitalDocumentAdmissionDate = context.hospitalDocumentAdmissionDate();
        LocalDate claimFormDischargeDate = context.claimFormDischargeDate();
        LocalDate hospitalDocumentDischargeDate = context.hospitalDocumentDischargeDate();

        boolean admissionMismatch = claimFormAdmissionDate != null
                && hospitalDocumentAdmissionDate != null
                && !claimFormAdmissionDate.equals(hospitalDocumentAdmissionDate);
        boolean dischargeMismatch = claimFormDischargeDate != null
                && hospitalDocumentDischargeDate != null
                && !claimFormDischargeDate.equals(hospitalDocumentDischargeDate);

        return admissionMismatch || dischargeMismatch
                ? trigger(String.format(
                "Admission/discharge date mismatch detected. Claim form admission=%s, hospital admission=%s, claim form discharge=%s, hospital discharge=%s.",
                displayDate(claimFormAdmissionDate),
                displayDate(hospitalDocumentAdmissionDate),
                displayDate(claimFormDischargeDate),
                displayDate(hospitalDocumentDischargeDate)
        ))
                : noTrigger();
    }

    private String displayDate(LocalDate value) {
        return value == null ? "N/A" : value.toString();
    }
}
