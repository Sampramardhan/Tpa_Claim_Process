package com.tpa.auth.controller;

import com.tpa.auth.dto.AuthResponse;
import com.tpa.auth.dto.AuthenticatedUserResponse;
import com.tpa.auth.dto.ChangePasswordRequest;
import com.tpa.auth.dto.CustomerLoginRequest;
import com.tpa.auth.dto.CustomerRegistrationRequest;
import com.tpa.auth.dto.StaticRoleLoginRequest;
import com.tpa.auth.service.AuthService;
import com.tpa.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/customer/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> registerCustomer(@Valid @RequestBody CustomerRegistrationRequest request) {
        return ApiResponse.success("Customer registration completed.", authService.registerCustomer(request));
    }

    @PostMapping("/customer/login")
    public ApiResponse<AuthResponse> loginCustomer(@Valid @RequestBody CustomerLoginRequest request) {
        return ApiResponse.success("Customer login completed.", authService.loginCustomer(request));
    }

    @PostMapping("/static/login")
    public ApiResponse<AuthResponse> loginStaticRole(@Valid @RequestBody StaticRoleLoginRequest request) {
        return ApiResponse.success("Role login completed.", authService.loginStaticRole(request));
    }

    @GetMapping("/me")
    public ApiResponse<AuthenticatedUserResponse> getCurrentUser(Authentication authentication) {
        return ApiResponse.success("Authenticated user loaded.", authService.getCurrentUser(authentication));
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(authentication, request);
        return ApiResponse.success("Password changed successfully.", null);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        return ApiResponse.success("Logged out successfully.", null);
    }
}
