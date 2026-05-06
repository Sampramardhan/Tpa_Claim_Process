package com.tpa.common;

import com.tpa.utils.DateTimeUtils;
import java.time.LocalDateTime;

public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        LocalDateTime timestamp
) {

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, DateTimeUtils.nowUtc());
    }

    public static <T> ApiResponse<T> failure(String message, T data) {
        return new ApiResponse<>(false, message, data, DateTimeUtils.nowUtc());
    }
}
