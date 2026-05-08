package com.tpa.fmg.repository;

import com.tpa.fmg.entity.FmgClaimDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FmgClaimDecisionRepository extends JpaRepository<FmgClaimDecision, UUID> {

    @Query("""
            SELECT DISTINCT d FROM FmgClaimDecision d
            LEFT JOIN FETCH d.triggeredRules
            WHERE d.claim.id = :claimId
            """)
    Optional<FmgClaimDecision> findByClaimIdWithTriggeredRules(@Param("claimId") UUID claimId);
}
