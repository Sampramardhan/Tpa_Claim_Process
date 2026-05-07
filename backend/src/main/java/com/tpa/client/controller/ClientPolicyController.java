package com.tpa.client.controller;

import com.tpa.common.ApiResponse;
import com.tpa.policies.dto.PolicyVerificationResponse;
import com.tpa.policies.service.PolicyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/client/policies")
public class ClientPolicyController {

    private final PolicyService policyService;

    public ClientPolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping("/verify/{policyNumber}")
    public ApiResponse<PolicyVerificationResponse> verifyPolicy(@PathVariable String policyNumber) {
        return ApiResponse.success("Policy verification completed.", policyService.verifyPolicy(policyNumber));
    }

    @GetMapping("/search")
    public ApiResponse<List<PolicyVerificationResponse>> searchPolicies(
            @RequestParam(value = "q", required = false, defaultValue = "") String query
    ) {
        return ApiResponse.success("Search results loaded.", policyService.searchPolicies(query));
    }

    @GetMapping
    public ApiResponse<List<PolicyVerificationResponse>> getAllCustomerPolicies() {
        return ApiResponse.success("All customer policies loaded.", policyService.getAllCustomerPolicies());
    }
}
