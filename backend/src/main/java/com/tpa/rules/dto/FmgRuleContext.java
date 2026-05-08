package com.tpa.rules.dto;

import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.ClaimDocumentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public record FmgRuleContext(
        Claim claim,
        ExtractedClaimData extractedData,
        Set<ClaimDocumentType> availableDocumentTypes,
        String registeredCustomerName,
        List<String> possibleDuplicateClaimNumbers
) {

    public FmgRuleContext {
        availableDocumentTypes = Set.copyOf(availableDocumentTypes);
        possibleDuplicateClaimNumbers = List.copyOf(possibleDuplicateClaimNumbers);
    }

    public boolean hasDocument(ClaimDocumentType documentType) {
        return availableDocumentTypes.contains(documentType);
    }

    public String policyNumber() {
        return firstNonBlank(
                value(ExtractedClaimData::getPolicyNumber),
                value(ExtractedClaimData::getClaimFormPolicyNumber),
                value(ExtractedClaimData::getHospitalDocumentPolicyNumber)
        );
    }

    public String claimFormIdentityName() {
        return firstNonBlank(
                value(ExtractedClaimData::getClaimFormPatientName),
                value(ExtractedClaimData::getClaimFormCustomerName)
        );
    }

    public String hospitalDocumentIdentityName() {
        return firstNonBlank(
                value(ExtractedClaimData::getHospitalDocumentPatientName),
                value(ExtractedClaimData::getHospitalDocumentCustomerName)
        );
    }

    public String claimFormHospitalName() {
        return value(ExtractedClaimData::getClaimFormHospitalName);
    }

    public String hospitalDocumentHospitalName() {
        return value(ExtractedClaimData::getHospitalDocumentHospitalName);
    }

    public LocalDate claimFormAdmissionDate() {
        return value(ExtractedClaimData::getClaimFormAdmissionDate);
    }

    public LocalDate hospitalDocumentAdmissionDate() {
        return value(ExtractedClaimData::getHospitalDocumentAdmissionDate);
    }

    public LocalDate claimFormDischargeDate() {
        return value(ExtractedClaimData::getClaimFormDischargeDate);
    }

    public LocalDate hospitalDocumentDischargeDate() {
        return value(ExtractedClaimData::getHospitalDocumentDischargeDate);
    }

    public LocalDate resolvedAdmissionDate() {
        return firstNonNull(
                value(ExtractedClaimData::getAdmissionDate),
                value(ExtractedClaimData::getHospitalDocumentAdmissionDate),
                value(ExtractedClaimData::getClaimFormAdmissionDate)
        );
    }

    public LocalDate resolvedDischargeDate() {
        return firstNonNull(
                value(ExtractedClaimData::getDischargeDate),
                value(ExtractedClaimData::getHospitalDocumentDischargeDate),
                value(ExtractedClaimData::getClaimFormDischargeDate)
        );
    }

    public BigDecimal claimedAmount() {
        return firstNonNull(
                value(ExtractedClaimData::getClaimedAmount),
                value(ExtractedClaimData::getClaimFormClaimedAmount),
                value(ExtractedClaimData::getHospitalDocumentClaimedAmount)
        );
    }

    public BigDecimal billAmount() {
        return firstNonNull(
                value(ExtractedClaimData::getTotalBillAmount),
                value(ExtractedClaimData::getHospitalDocumentTotalBillAmount),
                value(ExtractedClaimData::getClaimFormTotalBillAmount)
        );
    }

    private <T> T value(ValueExtractor<T> extractor) {
        return extractedData == null ? null : extractor.extract(extractedData);
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @FunctionalInterface
    private interface ValueExtractor<T> {

        T extract(ExtractedClaimData data);
    }
}
