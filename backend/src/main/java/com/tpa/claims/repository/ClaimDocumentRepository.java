package com.tpa.claims.repository;

import com.tpa.claims.entity.ClaimDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ClaimDocumentRepository extends JpaRepository<ClaimDocument, UUID> {

    List<ClaimDocument> findAllByClaim_IdOrderByUploadedAtAsc(UUID claimId);
}
