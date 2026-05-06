package com.tpa.auth.service;

public interface OtpService {

    String generateOtp(String destination);

    boolean validateOtp(String destination, String otp);
}
