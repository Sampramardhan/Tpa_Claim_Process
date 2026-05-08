package com.tpa.client.entity;

import com.tpa.claims.entity.Claim;
import com.tpa.client.enums.ClientReviewDecision;
import com.tpa.client.enums.ClientValidationStatus;
import com.tpa.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
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
@Table(name = "client_claim_validations", schema = "claim_schema")
public class ClientClaimValidation extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, unique = true)
    private Claim claim;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 30)
    private ClientValidationStatus validationStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_decision", nullable = false, length = 30)
    private ClientReviewDecision reviewDecision;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "validated_by", length = 255)
    private String validatedBy;

    @Column(name = "rejection_reason", length = 2000)
    private String rejectionReason;

    @Lob
    @Column(name = "validation_result_json")
    private String validationResultJson;
}
