package com.tpa.client.controller;

import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.service.ClaimService;
import com.tpa.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/client/claims")
public class ClientClaimController {

    private final ClaimService claimService;

    public ClientClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @GetMapping
    public ApiResponse<List<ClaimResponse>> getClientReviewQueue() {
        return ApiResponse.success("Customer submitted claims loaded.", claimService.getClientReviewQueue());
    }
}
