package com.tpa.ocr.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ClaimOcrExtractionResultTests {

    @Test
    void mergePrefersClaimFormFieldsAndHospitalDocumentFieldsInExpectedPlaces() {
        ClaimOcrExtractionResult claimFormResult = new ClaimOcrExtractionResult(
                "POL-1001",
                "Anita Sharma",
                "Rohan Sharma",
                "Acme Health",
                "Family Floater Gold",
                "Claim Form Hospital",
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 3, 12),
                new BigDecimal("12500.00"),
                "Cashless",
                null,
                null,
                null,
                null
        );
        ClaimOcrExtractionResult hospitalDocumentResult = new ClaimOcrExtractionResult(
                null,
                null,
                "Hospital Patient Name",
                null,
                null,
                "City Care Hospital",
                LocalDate.of(2026, 3, 11),
                LocalDate.of(2026, 3, 15),
                null,
                null,
                "Acute appendicitis",
                "BILL-7788",
                LocalDate.of(2026, 3, 16),
                new BigDecimal("18950.00")
        );

        ClaimOcrExtractionResult mergedResult = ClaimOcrExtractionResult.merge(
                claimFormResult,
                hospitalDocumentResult
        );

        assertEquals("POL-1001", mergedResult.policyNumber());
        assertEquals("Anita Sharma", mergedResult.customerName());
        assertEquals("Rohan Sharma", mergedResult.patientName());
        assertEquals("Acme Health", mergedResult.carrierName());
        assertEquals("Family Floater Gold", mergedResult.policyName());
        assertEquals("City Care Hospital", mergedResult.hospitalName());
        assertEquals(LocalDate.of(2026, 3, 11), mergedResult.admissionDate());
        assertEquals(LocalDate.of(2026, 3, 15), mergedResult.dischargeDate());
        assertEquals(new BigDecimal("12500.00"), mergedResult.claimedAmount());
        assertEquals("Cashless", mergedResult.claimType());
        assertEquals("Acute appendicitis", mergedResult.diagnosis());
        assertEquals("BILL-7788", mergedResult.billNumber());
        assertEquals(LocalDate.of(2026, 3, 16), mergedResult.billDate());
        assertEquals(new BigDecimal("18950.00"), mergedResult.totalBillAmount());
    }

    @Test
    void mergeFallsBackToHospitalDocumentWhenClaimFormFieldIsMissing() {
        ClaimOcrExtractionResult hospitalDocumentResult = new ClaimOcrExtractionResult(
                null,
                null,
                "Fallback Patient",
                null,
                null,
                "Fallback Hospital",
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 4, 5),
                null,
                null,
                "Observation",
                "HOSP-9900",
                LocalDate.of(2026, 4, 6),
                new BigDecimal("4200.00")
        );

        ClaimOcrExtractionResult mergedResult = ClaimOcrExtractionResult.merge(
                ClaimOcrExtractionResult.empty(),
                hospitalDocumentResult
        );

        assertEquals("Fallback Patient", mergedResult.patientName());
        assertEquals("Fallback Hospital", mergedResult.hospitalName());
        assertEquals(LocalDate.of(2026, 4, 1), mergedResult.admissionDate());
        assertEquals("Observation", mergedResult.diagnosis());
        assertEquals("HOSP-9900", mergedResult.billNumber());
        assertEquals(new BigDecimal("4200.00"), mergedResult.totalBillAmount());
        assertNull(mergedResult.policyNumber());
        assertNull(mergedResult.claimedAmount());
    }
}
