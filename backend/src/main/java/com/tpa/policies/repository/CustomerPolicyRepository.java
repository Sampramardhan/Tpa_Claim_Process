package com.tpa.policies.repository;

import com.tpa.policies.entity.CustomerPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerPolicyRepository extends JpaRepository<CustomerPolicy, UUID> {

    @Query("SELECT cp FROM CustomerPolicy cp " +
           "JOIN FETCH cp.policy p JOIN FETCH p.carrier " +
           "WHERE cp.id = :policyId AND cp.customer.id = :customerId")
    Optional<CustomerPolicy> findByIdAndCustomerIdWithPolicyDetails(
            @Param("policyId") UUID policyId,
            @Param("customerId") UUID customerId
    );

    @Query("SELECT cp FROM CustomerPolicy cp " +
           "JOIN FETCH cp.policy p JOIN FETCH p.carrier " +
           "JOIN FETCH cp.customer " +
           "WHERE cp.customer.id = :customerId")
    List<CustomerPolicy> findAllByCustomerIdWithDetails(@Param("customerId") UUID customerId);

    @Query("SELECT cp FROM CustomerPolicy cp " +
           "JOIN FETCH cp.policy p JOIN FETCH p.carrier " +
           "JOIN FETCH cp.customer " +
           "WHERE cp.uniquePolicyNumber = :policyNumber")
    Optional<CustomerPolicy> findByUniquePolicyNumberWithDetails(@Param("policyNumber") String policyNumber);

    boolean existsByCustomerIdAndPolicyIdAndActiveTrue(UUID customerId, UUID policyId);

    long countByPolicyId(UUID policyId);

    @Query("SELECT cp FROM CustomerPolicy cp " +
           "JOIN FETCH cp.policy p JOIN FETCH p.carrier " +
           "JOIN FETCH cp.customer c " +
           "WHERE LOWER(c.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(cp.uniquePolicyNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<CustomerPolicy> searchByCustomerNameOrPolicyNumber(@Param("query") String query);

    @Query("SELECT cp FROM CustomerPolicy cp " +
           "JOIN FETCH cp.policy p JOIN FETCH p.carrier " +
           "JOIN FETCH cp.customer")
    List<CustomerPolicy> findAllWithDetails();
}
