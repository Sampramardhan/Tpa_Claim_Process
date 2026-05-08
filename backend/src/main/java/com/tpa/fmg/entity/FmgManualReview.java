package com.tpa.fmg.entity;

import com.tpa.claims.entity.Claim;
import com.tpa.common.entity.BaseEntity;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "fmg_manual_reviews",
        schema = "claim_schema",
        indexes = {
                @Index(name = "fmg_manual_reviews_claim_idx", columnList = "claim_id"),
                @Index(name = "fmg_manual_reviews_decision_idx", columnList = "manual_decision"),
                @Index(name = "fmg_manual_reviews_reviewed_at_idx", columnList = "reviewed_at")
        }
)
public class FmgManualReview extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, unique = true)
    private Claim claim;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decision_id")
    private FmgClaimDecision decision;

    @Column(name = "reviewer_notes", columnDefinition = "TEXT")
    private String reviewerNotes;

    @Enumerated(EnumType.STRING)
    @Column(name = "manual_decision", length = 30)
    private ClaimStatus manualDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after_decision", length = 50)
    private ClaimStatus statusAfterDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_after_decision", length = 50)
    private ClaimStage stageAfterDecision;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "reviewed_by", length = 255)
    private String reviewedBy;

    public boolean isReviewed() {
        return manualDecision != null;
    }
}
