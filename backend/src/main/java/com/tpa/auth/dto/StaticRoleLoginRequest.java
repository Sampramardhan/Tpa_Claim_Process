package com.tpa.auth.dto;

import com.tpa.common.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StaticRoleLoginRequest(
        @NotNull(message = "Role is required.")
        UserRole role,

        @NotBlank(message = "Email is required.")
        @Email(message = "Email must be valid.")
        String email,

        @NotBlank(message = "Password is required.")
        String password
) {
}
