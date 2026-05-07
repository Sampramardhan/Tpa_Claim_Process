package com.tpa.claims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateExtractedClaimDataRequest(
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
}
