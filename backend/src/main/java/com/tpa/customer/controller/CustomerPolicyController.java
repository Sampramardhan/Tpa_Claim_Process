package com.tpa.customer.controller;

import com.tpa.common.ApiResponse;
import com.tpa.policies.dto.CustomerPolicyResponse;
import com.tpa.policies.dto.PolicyResponse;
import com.tpa.policies.dto.PurchasePolicyRequest;
import com.tpa.policies.service.PolicyService;
import com.tpa.security.TpaUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customer/policies")
public class CustomerPolicyController {

    private final PolicyService policyService;

    public CustomerPolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping("/catalog")
    public ApiResponse<List<PolicyResponse>> getActivePolicies() {
        return ApiResponse.success("Active policies loaded.", policyService.getActivePolicies());
    }

    @PostMapping("/purchase")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CustomerPolicyResponse> purchasePolicy(
            @Valid @RequestBody PurchasePolicyRequest request,
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success("Policy purchased successfully.", policyService.purchasePolicy(request, principal));
    }

    @GetMapping
    public ApiResponse<List<CustomerPolicyResponse>> getMyPolicies(
            @AuthenticationPrincipal TpaUserPrincipal principal
    ) {
        return ApiResponse.success("Customer policies loaded.", policyService.getCustomerPolicies(principal));
    }
}
