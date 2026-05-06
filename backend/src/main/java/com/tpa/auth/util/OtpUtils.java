package com.tpa.auth.util;

import java.security.SecureRandom;

public final class OtpUtils {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int DEFAULT_OTP_LENGTH = 6;

    private OtpUtils() {
    }

    public static String generateNumericOtp() {
        int upperBound = (int) Math.pow(10, DEFAULT_OTP_LENGTH);
        return String.format("%0" + DEFAULT_OTP_LENGTH + "d", SECURE_RANDOM.nextInt(upperBound));
    }
}
