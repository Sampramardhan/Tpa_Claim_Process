package com.tpa.utils;

import com.tpa.exception.ValidationException;

import java.util.Collection;

public final class ValidationUtils {

    private ValidationUtils() {
    }

    public static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(fieldName + " must not be blank.");
        }
    }

    public static void requireNonNull(Object value, String fieldName) {
        if (value == null) {
            throw new ValidationException(fieldName + " must not be null.");
        }
    }

    public static boolean isEmpty(Collection<?> values) {
        return values == null || values.isEmpty();
    }
}
