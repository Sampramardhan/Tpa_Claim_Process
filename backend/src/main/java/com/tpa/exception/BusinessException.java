package com.tpa.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final String errorCode;

    private final Object details;

    public BusinessException(String errorCode, String message) {
        this(errorCode, message, null);
    }

    public BusinessException(String errorCode, String message, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
