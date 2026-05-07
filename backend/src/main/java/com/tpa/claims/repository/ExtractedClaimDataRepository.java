package com.tpa.claims.repository;

import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.OcrStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ExtractedClaimDataRepository extends JpaRepository<ExtractedClaimData, UUID> {

    Optional<ExtractedClaimData> findByClaim_Id(UUID claimId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE ExtractedClaimData e
            SET e.ocrStatus = :nextStatus
            WHERE e.claim.id = :claimId AND e.ocrStatus = :expectedStatus
            """)
    int updateOcrStatusIfCurrent(
            @Param("claimId") UUID claimId,
            @Param("expectedStatus") OcrStatus expectedStatus,
            @Param("nextStatus") OcrStatus nextStatus
    );
}
