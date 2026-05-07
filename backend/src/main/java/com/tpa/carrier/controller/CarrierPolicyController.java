package com.tpa.carrier.controller;

import com.tpa.common.ApiResponse;
import com.tpa.policies.dto.CreatePolicyRequest;
import com.tpa.policies.dto.PolicyResponse;
import com.tpa.policies.service.PolicyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/carrier/policies")
public class CarrierPolicyController {

    private final PolicyService policyService;

    public CarrierPolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PolicyResponse> createPolicy(@Valid @RequestBody CreatePolicyRequest request) {
        return ApiResponse.success("Policy created successfully.", policyService.createPolicy(request));
    }

    @GetMapping
    public ApiResponse<List<PolicyResponse>> getAllPolicies() {
        return ApiResponse.success("Carrier policies loaded.", policyService.getAllPolicies());
    }

    @PatchMapping("/{id}/toggle-active")
    public ApiResponse<PolicyResponse> toggleActive(@PathVariable UUID id) {
        return ApiResponse.success("Policy status updated.", policyService.togglePolicyActive(id));
    }
}
