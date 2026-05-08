package com.tpa.client.dto;

public record ValidationCheckResponse(
        String code,
        String label,
        boolean passed,
        String message
) {
}
