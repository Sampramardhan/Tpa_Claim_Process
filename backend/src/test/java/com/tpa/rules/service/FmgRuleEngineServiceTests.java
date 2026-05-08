package com.tpa.rules.service;

import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.customer.entity.Customer;
import com.tpa.policies.entity.CustomerPolicy;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.FmgRuleEvaluationResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;

class FmgRuleEngineServiceTests {

    private final ClientClaimMatchService clientClaimMatchService = new ClientClaimMatchService();
    private final FmgRuleEngineService fmgRuleEngineService = new FmgRuleEngineService(List.of(
            new MissingClaimFormRule(),
            new MissingHospitalDocumentRule(),
            new PolicyInactiveDuringAdmissionRule(),
            new MissingPolicyNumberRule(clientClaimMatchService),
            new CustomerIdentityMismatchRule(clientClaimMatchService),
            new HospitalNameMismatchRule(clientClaimMatchService),
            new AdmissionDischargeDateMismatchRule(),
            new ClaimedAmountExceedsBillAmountRule(),
            new HighClaimAmountRule(),
            new PossibleDuplicateClaimRule()
    ));

    @Test
    void rejectsWhenRejectRulesTriggerEvenIfManualReviewRulesAlsoTrigger() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                Set.of(ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> {
                    data.setPolicyNumber(null);
                    data.setClaimFormPolicyNumber(null);
                    data.setHospitalDocumentPolicyNumber(null);
                },
                policy -> {
                },
                List.of()
        ));

        assertEquals(ClaimStatus.REJECTED, result.decision());
        assertEquals(ClaimStage.COMPLETED, result.resultingStage());
        assertIterableEquals(List.of("RULE_1", "RULE_4"), triggeredCodes(result));
    }

    @Test
    void rejectsWhenPolicyIsInactiveDuringAdmissionDate() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> data.setAdmissionDate(LocalDate.of(2026, 5, 10)),
                policy -> policy.setExpiryDate(LocalDate.of(2026, 5, 1)),
                List.of()
        ));

        assertEquals(ClaimStatus.REJECTED, result.decision());
        assertIterableEquals(List.of("RULE_3"), triggeredCodes(result));
    }

    @Test
    void routesToManualReviewWhenIdentityValuesMismatch() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> data.setHospitalDocumentPatientName("Rahul Rao"),
                policy -> {
                },
                List.of()
        ));

        assertEquals(ClaimStatus.MANUAL_REVIEW, result.decision());
        assertEquals(ClaimStage.FMG_MANUAL_REVIEW, result.resultingStage());
        assertIterableEquals(List.of("RULE_5"), triggeredCodes(result));
    }

    @Test
    void routesToManualReviewWhenHospitalAndDateMismatch() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> {
                    data.setHospitalDocumentHospitalName("Metro Care Hospital");
                    data.setHospitalDocumentAdmissionDate(LocalDate.of(2026, 4, 2));
                },
                policy -> {
                },
                List.of()
        ));

        assertEquals(ClaimStatus.MANUAL_REVIEW, result.decision());
        assertIterableEquals(List.of("RULE_6", "RULE_7"), triggeredCodes(result));
    }

    @Test
    void routesToManualReviewWhenAmountsExceedBillAndThreshold() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> {
                    data.setClaimedAmount(new BigDecimal("70000.00"));
                    data.setClaimFormClaimedAmount(new BigDecimal("70000.00"));
                    data.setTotalBillAmount(new BigDecimal("65000.00"));
                    data.setHospitalDocumentTotalBillAmount(new BigDecimal("65000.00"));
                },
                policy -> {
                },
                List.of()
        ));

        assertEquals(ClaimStatus.MANUAL_REVIEW, result.decision());
        assertIterableEquals(List.of("RULE_8", "RULE_9"), triggeredCodes(result));
    }

    @Test
    void routesToManualReviewWhenPossibleDuplicateClaimExists() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> {
                },
                policy -> {
                },
                List.of("CLM-2026-0002")
        ));

        assertEquals(ClaimStatus.MANUAL_REVIEW, result.decision());
        assertIterableEquals(List.of("RULE_10"), triggeredCodes(result));
    }

    @Test
    void approvesWhenNoRulesTrigger() {
        FmgRuleEvaluationResult result = fmgRuleEngineService.evaluate(buildContext(
                EnumSet.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                data -> {
                },
                policy -> {
                },
                List.of()
        ));

        assertEquals(ClaimStatus.APPROVED, result.decision());
        assertEquals(ClaimStage.CARRIER_REVIEW, result.resultingStage());
        assertEquals(List.of(), triggeredCodes(result));
    }

    private FmgRuleContext buildContext(
            Set<ClaimDocumentType> documentTypes,
            java.util.function.Consumer<ExtractedClaimData> dataCustomizer,
            java.util.function.Consumer<CustomerPolicy> policyCustomizer,
            List<String> duplicateClaimNumbers
    ) {
        String registeredCustomerName = "Anita Rao";
        Customer customer = Customer.builder()
                .fullName(registeredCustomerName)
                .email("anita@example.com")
                .mobile("9999999999")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .build();

        CustomerPolicy customerPolicy = CustomerPolicy.builder()
                .customer(customer)
                .purchaseDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2026, 12, 31))
                .active(true)
                .uniquePolicyNumber("POL-123")
                .build();
        policyCustomizer.accept(customerPolicy);

        Claim claim = Claim.builder()
                .claimNumber("CLM-2026-0001")
                .customer(customer)
                .customerPolicy(customerPolicy)
                .status(ClaimStatus.UNDER_REVIEW)
                .stage(ClaimStage.FMG_REVIEW)
                .build();

        ExtractedClaimData extractedClaimData = ExtractedClaimData.builder()
                .claim(claim)
                .policyNumber("POL-123")
                .patientName(registeredCustomerName)
                .customerName(registeredCustomerName)
                .hospitalName("City Care Hospital")
                .admissionDate(LocalDate.of(2026, 4, 1))
                .dischargeDate(LocalDate.of(2026, 4, 5))
                .claimedAmount(new BigDecimal("15000.00"))
                .totalBillAmount(new BigDecimal("20000.00"))
                .billNumber("INV-1001")
                .claimFormPolicyNumber("POL-123")
                .claimFormCustomerName(registeredCustomerName)
                .claimFormPatientName(registeredCustomerName)
                .claimFormHospitalName("City Care Hospital")
                .claimFormAdmissionDate(LocalDate.of(2026, 4, 1))
                .claimFormDischargeDate(LocalDate.of(2026, 4, 5))
                .claimFormClaimedAmount(new BigDecimal("15000.00"))
                .hospitalDocumentPolicyNumber("POL-123")
                .hospitalDocumentCustomerName(registeredCustomerName)
                .hospitalDocumentPatientName(registeredCustomerName)
                .hospitalDocumentHospitalName("City Care Hospital")
                .hospitalDocumentAdmissionDate(LocalDate.of(2026, 4, 1))
                .hospitalDocumentDischargeDate(LocalDate.of(2026, 4, 5))
                .hospitalDocumentBillNumber("INV-1001")
                .hospitalDocumentTotalBillAmount(new BigDecimal("20000.00"))
                .build();
        dataCustomizer.accept(extractedClaimData);
        claim.setExtractedClaimData(extractedClaimData);

        return new FmgRuleContext(
                claim,
                extractedClaimData,
                documentTypes,
                registeredCustomerName,
                duplicateClaimNumbers
        );
    }

    private List<String> triggeredCodes(FmgRuleEvaluationResult result) {
        return result.triggeredRules().stream().map(trigger -> trigger.code()).toList();
    }
}
