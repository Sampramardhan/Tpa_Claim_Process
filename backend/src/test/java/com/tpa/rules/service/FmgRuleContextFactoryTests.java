package com.tpa.rules.service;

import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.customer.entity.Customer;
import com.tpa.policies.entity.CustomerPolicy;
import com.tpa.rules.dto.FmgRuleContext;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FmgRuleContextFactoryTests {

    @Test
    void createMarksClaimsWithMatchingBillNumbersAsPossibleDuplicates() {
        ClaimRepository claimRepository = mock(ClaimRepository.class);
        ClientClaimMatchService clientClaimMatchService = new ClientClaimMatchService();
        FmgRuleContextFactory factory = new FmgRuleContextFactory(claimRepository, clientClaimMatchService);

        CustomerPolicy sharedPolicy = CustomerPolicy.builder()
                .id(UUID.randomUUID())
                .purchaseDate(LocalDate.of(2026, 1, 1))
                .expiryDate(LocalDate.of(2026, 12, 31))
                .active(true)
                .uniquePolicyNumber("POL-123")
                .build();

        Claim currentClaim = claim("CLM-2026-0001", sharedPolicy, claimData("INV-1001"));
        Claim duplicateClaim = claim("CLM-2026-0002", sharedPolicy, claimData("INV 1001"));

        when(claimRepository.findDuplicateCandidatesByCustomerPolicyId(sharedPolicy.getId(), currentClaim.getId()))
                .thenReturn(List.of(duplicateClaim));

        FmgRuleContext context = factory.create(currentClaim, List.of());

        assertEquals(List.of("CLM-2026-0002"), context.possibleDuplicateClaimNumbers());
    }

    private Claim claim(String claimNumber, CustomerPolicy customerPolicy, ExtractedClaimData extractedClaimData) {
        Customer customer = Customer.builder()
                .fullName("Anita Rao")
                .email("anita@example.com")
                .mobile("9999999999")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .build();

        Claim claim = Claim.builder()
                .id(UUID.randomUUID())
                .claimNumber(claimNumber)
                .customer(customer)
                .customerPolicy(customerPolicy)
                .status(ClaimStatus.UNDER_REVIEW)
                .stage(ClaimStage.FMG_REVIEW)
                .build();
        extractedClaimData.setClaim(claim);
        claim.setExtractedClaimData(extractedClaimData);
        return claim;
    }

    private ExtractedClaimData claimData(String billNumber) {
        return ExtractedClaimData.builder()
                .billNumber(billNumber)
                .patientName("Anita Rao")
                .admissionDate(LocalDate.of(2026, 4, 1))
                .dischargeDate(LocalDate.of(2026, 4, 5))
                .claimedAmount(new BigDecimal("15000.00"))
                .totalBillAmount(new BigDecimal("20000.00"))
                .build();
    }
}
