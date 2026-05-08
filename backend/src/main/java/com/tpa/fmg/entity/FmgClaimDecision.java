package com.tpa.fmg.entity;

import com.tpa.claims.entity.Claim;
import com.tpa.common.entity.BaseEntity;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "fmg_claim_decisions",
        schema = "claim_schema",
        indexes = {
                @Index(name = "fmg_claim_decisions_decision_idx", columnList = "decision"),
                @Index(name = "fmg_claim_decisions_decided_at_idx", columnList = "decided_at"),
                @Index(name = "fmg_claim_decisions_final_decision_idx", columnList = "final_decision")
        }
)
public class FmgClaimDecision extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, unique = true)
    private Claim claim;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 30)
    private ClaimStatus recommendedDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_after_decision", nullable = false, length = 50)
    private ClaimStatus statusAfterDecision;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage_after_decision", nullable = false, length = 50)
    private ClaimStage stageAfterDecision;

    @Column(name = "decided_at", nullable = false)
    private LocalDateTime evaluatedAt;

    @Column(name = "decided_by", length = 255)
    private String evaluatedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_decision", length = 30)
    private ClaimStatus finalDecision;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmed_by", length = 255)
    private String confirmedBy;

    @Builder.Default
    @OneToMany(mappedBy = "decision", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FmgClaimDecisionRule> triggeredRules = new ArrayList<>();

    public void replaceTriggeredRules(List<FmgClaimDecisionRule> rules) {
        triggeredRules.clear();
        rules.forEach(this::addTriggeredRule);
    }

    public void addTriggeredRule(FmgClaimDecisionRule rule) {
        rule.setDecision(this);
        triggeredRules.add(rule);
    }

    public boolean isConfirmed() {
        return finalDecision != null;
    }
}
