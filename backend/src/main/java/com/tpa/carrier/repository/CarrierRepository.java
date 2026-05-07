package com.tpa.carrier.repository;

import com.tpa.carrier.entity.Carrier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CarrierRepository extends JpaRepository<Carrier, UUID> {

    Optional<Carrier> findByCarrierCodeIgnoreCase(String carrierCode);

    Optional<Carrier> findByCarrierNameIgnoreCase(String carrierName);

    List<Carrier> findAllByActiveTrue();

    boolean existsByCarrierCodeIgnoreCase(String carrierCode);

    boolean existsByCarrierNameIgnoreCase(String carrierName);
}
