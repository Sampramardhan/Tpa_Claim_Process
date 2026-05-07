package com.tpa.ocr.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ClaimOcrExtractionResult(
        String policyNumber,
        String customerName,
        String patientName,
        String carrierName,
        String policyName,
        String hospitalName,
        LocalDate admissionDate,
        LocalDate dischargeDate,
        BigDecimal claimedAmount,
        String claimType,
        String diagnosis,
        String billNumber,
        LocalDate billDate,
        BigDecimal totalBillAmount
) {

    public static ClaimOcrExtractionResult merge(
            ClaimOcrExtractionResult claimFormResult,
            ClaimOcrExtractionResult hospitalDocumentResult
    ) {
        ClaimOcrExtractionResult claimForm = claimFormResult == null ? empty() : claimFormResult;
        ClaimOcrExtractionResult hospitalDocument = hospitalDocumentResult == null ? empty() : hospitalDocumentResult;

        return new ClaimOcrExtractionResult(
                firstNonBlank(claimForm.policyNumber(), hospitalDocument.policyNumber()),
                firstNonBlank(claimForm.customerName(), hospitalDocument.customerName()),
                firstNonBlank(claimForm.patientName(), hospitalDocument.patientName()),
                firstNonBlank(claimForm.carrierName(), hospitalDocument.carrierName()),
                firstNonBlank(claimForm.policyName(), hospitalDocument.policyName()),
                firstNonBlank(hospitalDocument.hospitalName(), claimForm.hospitalName()),
                firstNonNull(hospitalDocument.admissionDate(), claimForm.admissionDate()),
                firstNonNull(hospitalDocument.dischargeDate(), claimForm.dischargeDate()),
                firstNonNull(claimForm.claimedAmount(), hospitalDocument.claimedAmount()),
                firstNonBlank(claimForm.claimType(), hospitalDocument.claimType()),
                firstNonBlank(hospitalDocument.diagnosis(), claimForm.diagnosis()),
                firstNonBlank(hospitalDocument.billNumber(), claimForm.billNumber()),
                firstNonNull(hospitalDocument.billDate(), claimForm.billDate()),
                firstNonNull(hospitalDocument.totalBillAmount(), claimForm.totalBillAmount())
        );
    }

    public static ClaimOcrExtractionResult empty() {
        return new ClaimOcrExtractionResult(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    private static String firstNonBlank(String preferredValue, String fallbackValue) {
        return isBlank(preferredValue) ? fallbackValue : preferredValue;
    }

    private static <T> T firstNonNull(T preferredValue, T fallbackValue) {
        return preferredValue != null ? preferredValue : fallbackValue;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
