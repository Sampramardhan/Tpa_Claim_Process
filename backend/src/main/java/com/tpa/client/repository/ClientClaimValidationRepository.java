package com.tpa.client.repository;

import com.tpa.client.entity.ClientClaimValidation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClientClaimValidationRepository extends JpaRepository<ClientClaimValidation, UUID> {

    Optional<ClientClaimValidation> findByClaim_Id(UUID claimId);
}
