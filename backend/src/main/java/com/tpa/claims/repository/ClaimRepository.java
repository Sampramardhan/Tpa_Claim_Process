package com.tpa.claims.repository;

import com.tpa.claims.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.customer.id = :customerId
            ORDER BY COALESCE(c.submissionDate, c.createdAt) DESC, c.createdAt DESC
            """)
    List<Claim> findAllByCustomerIdWithPolicyDetails(@Param("customerId") UUID customerId);

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.id = :claimId AND c.customer.id = :customerId
            """)
    Optional<Claim> findByIdAndCustomerIdWithPolicyDetails(
            @Param("claimId") UUID claimId,
            @Param("customerId") UUID customerId
    );

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.customer
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.id = :claimId
            """)
    Optional<Claim> findByIdWithPolicyDetails(@Param("claimId") UUID claimId);

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.stage = :stage AND c.status = :status
            ORDER BY c.submissionDate DESC, c.createdAt DESC
            """)
    List<Claim> findAllByStageAndStatusWithDetails(
            @Param("stage") com.tpa.common.enums.ClaimStage stage,
            @Param("status") com.tpa.common.enums.ClaimStatus status
    );

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.customer
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.id = :claimId
            """)
    Optional<Claim> findByIdWithReviewDetails(@Param("claimId") UUID claimId);

    @Query("""
            SELECT c FROM Claim c
            JOIN FETCH c.customer
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.customer
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.stage IN :stages AND c.status = :status
            ORDER BY c.submissionDate DESC, c.createdAt DESC
            """)
    List<Claim> findAllByStagesAndStatusWithDetails(
            @Param("stages") Collection<com.tpa.common.enums.ClaimStage> stages,
            @Param("status") com.tpa.common.enums.ClaimStatus status
    );

    Optional<Claim> findByClaimNumber(String claimNumber);

    boolean existsByClaimNumber(String claimNumber);
}
