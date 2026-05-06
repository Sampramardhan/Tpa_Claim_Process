package com.tpa.auth.dto;

import com.tpa.common.enums.UserRole;

import java.util.UUID;

public record AuthenticatedUserResponse(
        UUID id,
        String fullName,
        String email,
        UserRole role
) {
}
