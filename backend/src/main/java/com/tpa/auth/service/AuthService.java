package com.tpa.auth.service;

import com.tpa.auth.dto.AuthResponse;
import com.tpa.auth.dto.AuthenticatedUserResponse;
import com.tpa.auth.dto.CustomerLoginRequest;
import com.tpa.auth.dto.CustomerRegistrationRequest;
import com.tpa.auth.dto.StaticRoleLoginRequest;
import com.tpa.auth.entity.User;
import com.tpa.auth.repository.UserRepository;
import com.tpa.common.enums.UserRole;
import com.tpa.customer.entity.Customer;
import com.tpa.customer.repository.CustomerRepository;
import com.tpa.exception.UnauthorizedException;
import com.tpa.exception.ValidationException;
import com.tpa.security.JwtService;
import com.tpa.security.SecurityProperties;
import com.tpa.security.TpaUserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecurityProperties securityProperties;

    public AuthService(
            UserRepository userRepository,
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            SecurityProperties securityProperties
    ) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.securityProperties = securityProperties;
    }

    @Transactional
    public AuthResponse registerCustomer(CustomerRegistrationRequest request) {
        String email = normalizeEmail(request.email());
        String mobile = request.mobile().trim();

        validateCustomerUniqueness(email, mobile);

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .mobile(mobile)
                .dateOfBirth(request.dateOfBirth())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.CUSTOMER)
                .createdBy(email)
                .updatedBy(email)
                .build();

        User savedUser = userRepository.save(user);

        Customer customer = Customer.builder()
                .user(savedUser)
                .fullName(savedUser.getFullName())
                .email(savedUser.getEmail())
                .mobile(savedUser.getMobile())
                .dateOfBirth(savedUser.getDateOfBirth())
                .createdBy(email)
                .updatedBy(email)
                .build();
        customerRepository.save(customer);

        return buildAuthResponse(TpaUserPrincipal.fromUser(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse loginCustomer(CustomerLoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        if (user.getRole() != UserRole.CUSTOMER || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        return buildAuthResponse(TpaUserPrincipal.fromUser(user));
    }

    public AuthResponse loginStaticRole(StaticRoleLoginRequest request) {
        UserRole role = request.role();
        if (role == UserRole.CUSTOMER) {
            throw new ValidationException("Customer role must use the customer login endpoint.");
        }

        SecurityProperties.RoleCredential credential = getCredentialForRole(role);
        String email = normalizeEmail(request.email());

        if (!StringUtils.hasText(credential.getEmail()) || !credential.getEmail().equalsIgnoreCase(email)) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!matchesStaticPassword(request.password(), credential)) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        TpaUserPrincipal principal = new TpaUserPrincipal(
                null,
                getDisplayNameForRole(role),
                email,
                "",
                role
        );

        return buildAuthResponse(principal);
    }

    public AuthenticatedUserResponse getCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof TpaUserPrincipal principal)) {
            throw new UnauthorizedException("Authentication is required.");
        }

        return toAuthenticatedUserResponse(principal);
    }

    private void validateCustomerUniqueness(String email, String mobile) {
        if (userRepository.existsByEmailIgnoreCase(email) || customerRepository.existsByEmailIgnoreCase(email)) {
            throw new ValidationException("Email is already registered.", Map.of("email", email));
        }

        if (userRepository.existsByMobile(mobile) || customerRepository.existsByMobile(mobile)) {
            throw new ValidationException("Mobile is already registered.", Map.of("mobile", mobile));
        }
    }

    private AuthResponse buildAuthResponse(TpaUserPrincipal principal) {
        LocalDateTime expiresAt = jwtService.getExpiresAt();
        String token = jwtService.generateToken(principal, expiresAt);
        return new AuthResponse(
                token,
                "Bearer",
                expiresAt,
                toAuthenticatedUserResponse(principal)
        );
    }

    private AuthenticatedUserResponse toAuthenticatedUserResponse(TpaUserPrincipal principal) {
        return new AuthenticatedUserResponse(
                principal.getId(),
                principal.getFullName(),
                principal.getEmail(),
                principal.getRole()
        );
    }

    private boolean matchesStaticPassword(String rawPassword, SecurityProperties.RoleCredential credential) {
        if (StringUtils.hasText(credential.getPasswordHash())) {
            return passwordEncoder.matches(rawPassword, credential.getPasswordHash());
        }

        return StringUtils.hasText(credential.getPassword()) && credential.getPassword().equals(rawPassword);
    }

    private SecurityProperties.RoleCredential getCredentialForRole(UserRole role) {
        return switch (role) {
            case CLIENT -> securityProperties.getStaticLogins().getClient();
            case FMG -> securityProperties.getStaticLogins().getFmg();
            case CARRIER -> securityProperties.getStaticLogins().getCarrier();
            case CUSTOMER -> throw new ValidationException("Customer role must use the customer login endpoint.");
        };
    }

    private String getDisplayNameForRole(UserRole role) {
        return switch (role) {
            case CLIENT -> "Client Portal";
            case FMG -> "FMG Portal";
            case CARRIER -> "Carrier Portal";
            case CUSTOMER -> "Customer Portal";
        };
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
