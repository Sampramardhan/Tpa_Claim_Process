package com.tpa.policies.entity;

import com.tpa.carrier.entity.Carrier;
import com.tpa.common.entity.AuditEntity;
import com.tpa.common.enums.PolicyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "insurance_policies", schema = "carrier_schema")
public class InsurancePolicy extends AuditEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "carrier_id", nullable = false)
    private Carrier carrier;

    @Column(name = "policy_name", nullable = false, length = 200)
    private String policyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "policy_type", nullable = false, length = 50)
    private PolicyType policyType;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "coverage_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal coverageAmount;

    @Column(name = "premium_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal premiumAmount;

    @Column(name = "waiting_period_days", nullable = false)
    private int waitingPeriodDays;

    @Column(name = "policy_duration_months", nullable = false)
    private int policyDurationMonths;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
