package com.tpa.claims.service;

import java.util.UUID;

/**
 * Event published when a customer finalizes and submits their draft claim.
 */
public record ClaimSubmittedEvent(UUID claimId, String customerEmail) {
}
