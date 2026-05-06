package com.tpa.common;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data
) {
}
