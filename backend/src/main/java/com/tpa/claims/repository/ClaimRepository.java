package com.tpa.claims.repository;

import com.tpa.claims.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
            ORDER BY c.submissionDate DESC, c.createdAt DESC
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
            JOIN FETCH c.customerPolicy cp
            JOIN FETCH cp.policy p
            JOIN FETCH p.carrier
            LEFT JOIN FETCH c.extractedClaimData
            WHERE c.id = :claimId
            """)
    Optional<Claim> findByIdWithPolicyDetails(@Param("claimId") UUID claimId);

    Optional<Claim> findByClaimNumber(String claimNumber);

    boolean existsByClaimNumber(String claimNumber);
}
