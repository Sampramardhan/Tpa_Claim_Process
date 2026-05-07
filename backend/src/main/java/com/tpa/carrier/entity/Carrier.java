package com.tpa.carrier.entity;

import com.tpa.common.entity.AuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "carriers", schema = "carrier_schema")
public class Carrier extends AuditEntity {

    @Column(name = "carrier_name", nullable = false, length = 150)
    private String carrierName;

    @Column(name = "carrier_code", nullable = false, unique = true, length = 10)
    private String carrierCode;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}
