package com.tpa.fmg.repository;

import com.tpa.fmg.entity.FmgManualReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FmgManualReviewRepository extends JpaRepository<FmgManualReview, UUID> {

    Optional<FmgManualReview> findByClaimId(UUID claimId);
}
