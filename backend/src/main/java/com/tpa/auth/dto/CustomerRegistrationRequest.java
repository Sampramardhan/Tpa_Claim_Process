package com.tpa.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CustomerRegistrationRequest(
        @NotBlank(message = "Full name is required.")
        @Size(max = 150, message = "Full name must be 150 characters or fewer.")
        String fullName,

        @NotBlank(message = "Email is required.")
        @Email(message = "Email must be valid.")
        @Size(max = 255, message = "Email must be 255 characters or fewer.")
        String email,

        @NotBlank(message = "Mobile is required.")
        @Pattern(regexp = "^\\+?[1-9]\\d{9,14}$", message = "Mobile must be a valid international number.")
        String mobile,

        @NotNull(message = "Date of birth is required.")
        @Past(message = "Date of birth must be in the past.")
        LocalDate dateOfBirth,

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
        String password
) {
}
