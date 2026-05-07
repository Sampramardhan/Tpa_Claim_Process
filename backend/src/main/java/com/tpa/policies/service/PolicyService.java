package com.tpa.policies.service;

import com.tpa.carrier.entity.Carrier;
import com.tpa.carrier.repository.CarrierRepository;
import com.tpa.customer.entity.Customer;
import com.tpa.customer.repository.CustomerRepository;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.exception.ValidationException;
import com.tpa.policies.dto.CreatePolicyRequest;
import com.tpa.policies.dto.CustomerPolicyResponse;
import com.tpa.policies.dto.PolicyResponse;
import com.tpa.policies.dto.PolicyVerificationResponse;
import com.tpa.policies.dto.PurchasePolicyRequest;
import com.tpa.policies.entity.CustomerPolicy;
import com.tpa.policies.entity.InsurancePolicy;
import com.tpa.policies.repository.CustomerPolicyRepository;
import com.tpa.policies.repository.InsurancePolicyRepository;
import com.tpa.security.TpaUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PolicyService {

    private final InsurancePolicyRepository policyRepository;
    private final CustomerPolicyRepository customerPolicyRepository;
    private final CarrierRepository carrierRepository;
    private final CustomerRepository customerRepository;
    private final PolicyNumberGenerator policyNumberGenerator;

    public PolicyService(
            InsurancePolicyRepository policyRepository,
            CustomerPolicyRepository customerPolicyRepository,
            CarrierRepository carrierRepository,
            CustomerRepository customerRepository,
            PolicyNumberGenerator policyNumberGenerator
    ) {
        this.policyRepository = policyRepository;
        this.customerPolicyRepository = customerPolicyRepository;
        this.carrierRepository = carrierRepository;
        this.customerRepository = customerRepository;
        this.policyNumberGenerator = policyNumberGenerator;
    }

    // ── Carrier Operations ──────────────────────────────────────

    @Transactional
    public PolicyResponse createPolicy(CreatePolicyRequest request) {
        Carrier carrier = resolveOrCreateCarrier(
                request.carrierName().trim(),
                request.carrierCode().trim().toUpperCase()
        );

        InsurancePolicy policy = InsurancePolicy.builder()
                .carrier(carrier)
                .policyName(request.policyName().trim())
                .policyType(request.policyType())
                .description(request.description())
                .coverageAmount(request.coverageAmount())
                .premiumAmount(request.premiumAmount())
                .waitingPeriodDays(request.waitingPeriodDays())
                .policyDurationMonths(request.policyDurationMonths())
                .active(true)
                .createdBy("CARRIER")
                .updatedBy("CARRIER")
                .build();

        InsurancePolicy saved = policyRepository.save(policy);
        return toResponse(saved, 0L);
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> getAllPolicies() {
        return policyRepository.findAllWithCarrier().stream()
                .map(p -> toResponse(p, customerPolicyRepository.countByPolicyId(p.getId())))
                .toList();
    }

    @Transactional
    public PolicyResponse togglePolicyActive(UUID policyId) {
        InsurancePolicy policy = policyRepository.findByIdWithCarrier(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found."));

        policy.setActive(!policy.isActive());
        policy.setUpdatedBy("CARRIER");
        policyRepository.save(policy);
        return toResponse(policy, customerPolicyRepository.countByPolicyId(policy.getId()));
    }

    // ── Customer Operations ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PolicyResponse> getActivePolicies() {
        return policyRepository.findAllActiveWithCarrier().stream()
                .map(p -> toResponse(p, customerPolicyRepository.countByPolicyId(p.getId())))
                .toList();
    }

    @Transactional
    public CustomerPolicyResponse purchasePolicy(PurchasePolicyRequest request, TpaUserPrincipal principal) {
        Customer customer = customerRepository.findByUser_Id(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        InsurancePolicy policy = policyRepository.findByIdWithCarrier(request.policyId())
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found."));

        if (!policy.isActive()) {
            throw new ValidationException("This policy is no longer available for purchase.");
        }

        if (customerPolicyRepository.existsByCustomerIdAndPolicyIdAndActiveTrue(
                customer.getId(), policy.getId())) {
            throw new ValidationException("You already have an active purchase of this policy.");
        }

        String policyNumber = policyNumberGenerator.generate(
                policy.getCarrier().getCarrierCode(), policy.getPolicyType());

        LocalDate purchaseDate = LocalDate.now();
        LocalDate expiryDate = purchaseDate.plusMonths(policy.getPolicyDurationMonths());

        CustomerPolicy customerPolicy = CustomerPolicy.builder()
                .policy(policy)
                .customer(customer)
                .purchaseDate(purchaseDate)
                .expiryDate(expiryDate)
                .active(true)
                .uniquePolicyNumber(policyNumber)
                .createdBy(principal.getEmail())
                .updatedBy(principal.getEmail())
                .build();

        CustomerPolicy saved = customerPolicyRepository.save(customerPolicy);
        return toCustomerPolicyResponse(saved, policy);
    }

    @Transactional(readOnly = true)
    public List<CustomerPolicyResponse> getCustomerPolicies(TpaUserPrincipal principal) {
        Customer customer = customerRepository.findByUser_Id(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        return customerPolicyRepository.findAllByCustomerIdWithDetails(customer.getId()).stream()
                .map(cp -> toCustomerPolicyResponse(cp, cp.getPolicy()))
                .toList();
    }

    // ── Client Verification Operations ──────────────────────────

    @Transactional(readOnly = true)
    public PolicyVerificationResponse verifyPolicy(String policyNumber) {
        CustomerPolicy cp = customerPolicyRepository.findByUniquePolicyNumberWithDetails(policyNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Policy number not found: " + policyNumber));
        return toVerificationResponse(cp);
    }

    @Transactional(readOnly = true)
    public List<PolicyVerificationResponse> searchPolicies(String query) {
        if (query == null || query.trim().isEmpty()) {
            return customerPolicyRepository.findAllWithDetails().stream()
                    .map(this::toVerificationResponse)
                    .toList();
        }
        return customerPolicyRepository.searchByCustomerNameOrPolicyNumber(query.trim()).stream()
                .map(this::toVerificationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PolicyVerificationResponse> getAllCustomerPolicies() {
        return customerPolicyRepository.findAllWithDetails().stream()
                .map(this::toVerificationResponse)
                .toList();
    }

    // ── Helpers ─────────────────────────────────────────────────

    private Carrier resolveOrCreateCarrier(String name, String code) {
        return carrierRepository.findByCarrierCodeIgnoreCase(code)
                .orElseGet(() -> {
                    Carrier newCarrier = Carrier.builder()
                            .carrierName(name)
                            .carrierCode(code)
                            .active(true)
                            .createdBy("CARRIER")
                            .updatedBy("CARRIER")
                            .build();
                    return carrierRepository.save(newCarrier);
                });
    }

    private PolicyResponse toResponse(InsurancePolicy p, long enrolledCount) {
        Carrier c = p.getCarrier();
        return new PolicyResponse(
                p.getId(),
                p.getPolicyName(),
                p.getPolicyType(),
                p.getDescription(),
                p.getCoverageAmount(),
                p.getPremiumAmount(),
                p.getWaitingPeriodDays(),
                p.getPolicyDurationMonths(),
                p.isActive(),
                c.getCarrierName(),
                c.getCarrierCode(),
                c.getId(),
                enrolledCount,
                p.getCreatedAt()
        );
    }

    private CustomerPolicyResponse toCustomerPolicyResponse(CustomerPolicy cp, InsurancePolicy p) {
        return new CustomerPolicyResponse(
                cp.getId(),
                cp.getUniquePolicyNumber(),
                p.getPolicyName(),
                p.getPolicyType(),
                p.getDescription(),
                p.getCoverageAmount(),
                p.getPremiumAmount(),
                p.getCarrier().getCarrierName(),
                cp.getPurchaseDate(),
                cp.getExpiryDate(),
                cp.isActive(),
                cp.getCreatedAt()
        );
    }

    private PolicyVerificationResponse toVerificationResponse(CustomerPolicy cp) {
        InsurancePolicy p = cp.getPolicy();
        Customer c = cp.getCustomer();
        return new PolicyVerificationResponse(
                cp.getId(),
                cp.getUniquePolicyNumber(),
                c.getFullName(),
                c.getEmail(),
                c.getId(),
                p.getPolicyName(),
                p.getPolicyType(),
                p.getCoverageAmount(),
                p.getCarrier().getCarrierName(),
                cp.getPurchaseDate(),
                cp.getExpiryDate(),
                cp.isActive()
        );
    }
}
