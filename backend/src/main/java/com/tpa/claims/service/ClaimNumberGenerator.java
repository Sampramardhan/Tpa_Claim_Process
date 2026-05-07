package com.tpa.claims.service;

import com.tpa.utils.DateTimeUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

@Service
public class ClaimNumberGenerator {

    private static final String CLAIM_NUMBER_PREFIX = "CLM";

    @PersistenceContext
    private EntityManager entityManager;

    public String generate() {
        int claimYear = DateTimeUtils.nowUtc().getYear();

        Number nextSequence = (Number) entityManager.createNativeQuery("""
                INSERT INTO claim_schema.claim_number_counters (claim_year, last_sequence, created_at, updated_at)
                VALUES (:claimYear, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (claim_year)
                DO UPDATE SET last_sequence = claim_schema.claim_number_counters.last_sequence + 1,
                              updated_at = CURRENT_TIMESTAMP
                RETURNING last_sequence
                """)
                .setParameter("claimYear", claimYear)
                .getSingleResult();

        return String.format("%s-%d-%06d", CLAIM_NUMBER_PREFIX, claimYear, nextSequence.longValue());
    }
}
