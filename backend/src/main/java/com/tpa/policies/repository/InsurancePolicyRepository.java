package com.tpa.policies.repository;

import com.tpa.policies.entity.InsurancePolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InsurancePolicyRepository extends JpaRepository<InsurancePolicy, UUID> {

    @Query("SELECT p FROM InsurancePolicy p JOIN FETCH p.carrier WHERE p.active = true")
    List<InsurancePolicy> findAllActiveWithCarrier();

    @Query("SELECT p FROM InsurancePolicy p JOIN FETCH p.carrier")
    List<InsurancePolicy> findAllWithCarrier();

    @Query("SELECT p FROM InsurancePolicy p JOIN FETCH p.carrier WHERE p.id = :id")
    Optional<InsurancePolicy> findByIdWithCarrier(UUID id);

    List<InsurancePolicy> findAllByCarrierId(UUID carrierId);
}
