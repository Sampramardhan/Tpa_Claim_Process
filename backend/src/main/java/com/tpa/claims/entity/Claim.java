package com.tpa.claims.entity;

import com.tpa.common.entity.AuditEntity;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.customer.entity.Customer;
import com.tpa.policies.entity.CustomerPolicy;
import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
        name = "claims",
        schema = "claim_schema",
        indexes = {
                @Index(name = "claims_customer_idx", columnList = "customer_id"),
                @Index(name = "claims_customer_policy_idx", columnList = "customer_policy_id"),
                @Index(name = "claims_status_idx", columnList = "status"),
                @Index(name = "claims_stage_idx", columnList = "stage"),
                @Index(name = "claims_submission_date_idx", columnList = "submission_date")
        }
)
public class Claim extends AuditEntity {

    @Column(name = "claim_number", nullable = false, unique = true, length = 25)
    private String claimNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_policy_id", nullable = false)
    private CustomerPolicy customerPolicy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ClaimStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 50)
    private ClaimStage stage;

    @Column(name = "submission_date", nullable = false)
    private LocalDateTime submissionDate;

    @Builder.Default
    @OneToMany(mappedBy = "claim")
    private List<ClaimDocument> documents = new ArrayList<>();

    @OneToOne(mappedBy = "claim")
    private ExtractedClaimData extractedClaimData;
}
