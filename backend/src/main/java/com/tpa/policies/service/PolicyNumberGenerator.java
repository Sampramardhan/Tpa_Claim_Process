package com.tpa.policies.service;

import com.tpa.common.enums.PolicyType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;

import java.time.Year;

@Service
public class PolicyNumberGenerator {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Generates a unique policy number in the format: CARRIER_CODE-TYPE_CODE-YEAR-SEQ.
     * Example: STAR-HLTH-2026-0001, HDFC-ADND-2026-0023
     */
    public String generate(String carrierCode, PolicyType policyType) {
        String typeCode = getTypeCode(policyType);
        int year = Year.now().getValue();

        Number seq = (Number) entityManager
                .createNativeQuery("SELECT nextval('carrier_schema.policy_number_seq')")
                .getSingleResult();

        return String.format("%s-%s-%d-%04d",
                carrierCode.toUpperCase(), typeCode, year, seq.longValue());
    }

    private String getTypeCode(PolicyType type) {
        return switch (type) {
            case HEALTH -> "HLTH";
            case LIFE -> "LIFE";
            case AD_AND_D -> "ADND";
            case CRITICAL_ILLNESS -> "CRIT";
        };
    }
}
