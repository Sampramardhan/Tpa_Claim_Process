package com.tpa.customer.repository;

import com.tpa.customer.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    Optional<Customer> findByUser_Id(UUID userId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByMobile(String mobile);
}
