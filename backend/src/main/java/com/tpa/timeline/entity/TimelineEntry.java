package com.tpa.timeline.entity;

import com.tpa.common.entity.BaseEntity;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "claim_timeline", schema = "claim_schema")
public class TimelineEntry extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 50)
    private ClaimStage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private ClaimStatus status;

    @Column(name = "event_timestamp", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "description", length = 500)
    private String description;
}
