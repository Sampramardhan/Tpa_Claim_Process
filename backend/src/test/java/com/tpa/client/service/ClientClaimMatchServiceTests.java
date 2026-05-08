package com.tpa.client.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientClaimMatchServiceTests {

    private final ClientClaimMatchService clientClaimMatchService = new ClientClaimMatchService();

    @Test
    void matchesPolicyNumberIgnoresCaseSpacingAndSeparators() {
        assertTrue(clientClaimMatchService.matchesPolicyNumber(
                " star-hlth 2026 / 0001 ",
                "STARHLTH20260001"
        ));
    }

    @Test
    void matchesPolicyNameUsesNormalizedTextComparison() {
        assertTrue(clientClaimMatchService.matchesPolicyName(
                "  HDFC   Ergo Health Secure  ",
                "hdfc ergo health secure"
        ));
    }

    @Test
    void matchesPolicyHolderNameWhenEitherCustomerOrPatientMatches() {
        assertTrue(clientClaimMatchService.matchesPolicyHolderName(
                "Anita Rao",
                "   anita   rao ",
                "Someone Else"
        ));
        assertTrue(clientClaimMatchService.matchesPolicyHolderName(
                "Anita Rao",
                "",
                "ANITA RAO"
        ));
    }

    @Test
    void rejectsDifferentIdentityValuesAfterNormalization() {
        assertFalse(clientClaimMatchService.matchesPolicyNumber(
                "STAR-HLTH-2026-0002",
                "STAR-HLTH-2026-0001"
        ));
        assertFalse(clientClaimMatchService.matchesPolicyName(
                "family first plan",
                "health secure plus"
        ));
        assertFalse(clientClaimMatchService.matchesPolicyHolderName(
                "Anita Rao",
                "Rahul Rao",
                "Priya Rao"
        ));
    }
}
