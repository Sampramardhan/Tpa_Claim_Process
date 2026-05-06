package com.tpa.exception;

public class ValidationException extends BusinessException {

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message);
    }

    public ValidationException(String message, Object details) {
        super("VALIDATION_ERROR", message, details);
    }
}
