package com.tpa.exception;

import com.tpa.utils.DateTimeUtils;
import java.time.LocalDateTime;

public record ErrorResponse(
        String errorCode,
        String message,
        Object details,
        LocalDateTime timestamp
) {

    public static ErrorResponse of(String errorCode, String message, Object details) {
        return new ErrorResponse(errorCode, message, details, DateTimeUtils.nowUtc());
    }
}
