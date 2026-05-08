package com.tpa.fmg.entity;

import com.tpa.common.entity.BaseEntity;
import com.tpa.rules.dto.RuleOutcome;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "fmg_claim_decision_rules",
        schema = "claim_schema",
        indexes = {
                @Index(name = "fmg_claim_decision_rules_decision_idx", columnList = "decision_id"),
                @Index(name = "fmg_claim_decision_rules_code_idx", columnList = "rule_code")
        }
)
public class FmgClaimDecisionRule extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "decision_id", nullable = false)
    private FmgClaimDecision decision;

    @Column(name = "rule_code", nullable = false, length = 50)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false, length = 255)
    private String ruleName;

    @Column(name = "rule_order", nullable = false)
    private Integer ruleOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_outcome", nullable = false, length = 30)
    private RuleOutcome ruleOutcome;

    @Column(name = "message", nullable = false, length = 2000)
    private String message;
}
