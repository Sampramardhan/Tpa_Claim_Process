package com.tpa.claims.dto;

import com.tpa.claims.enums.OcrStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record ExtractedClaimDataResponse(
        UUID id,
        UUID claimId,
        OcrStatus ocrStatus,
        LocalDateTime ocrProcessedAt,
        String ocrFailureReason,
        String policyNumber,
        String customerName,
        String patientName,
        String carrierName,
        String policyName,
        String hospitalName,
        LocalDate admissionDate,
        LocalDate dischargeDate,
        String claimType,
        String diagnosis,
        String billNumber,
        LocalDate billDate,
        BigDecimal totalBillAmount,
        BigDecimal claimedAmount
) {
}
