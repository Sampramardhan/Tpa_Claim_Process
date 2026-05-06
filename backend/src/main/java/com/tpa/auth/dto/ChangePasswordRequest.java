package com.tpa.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required.")
        String currentPassword,

        @NotBlank(message = "New password is required.")
        @Size(min = 8, max = 72, message = "New password must be between 8 and 72 characters.")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
                message = "New password must contain at least one uppercase letter, one lowercase letter, and one digit."
        )
        String newPassword
) {
}
