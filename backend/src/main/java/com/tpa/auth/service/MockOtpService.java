package com.tpa.auth.service;

import com.tpa.auth.util.OtpUtils;
import org.springframework.stereotype.Service;

@Service
public class MockOtpService implements OtpService {

    @Override
    public String generateOtp(String destination) {
        return OtpUtils.generateNumericOtp();
    }

    @Override
    public boolean validateOtp(String destination, String otp) {
        return otp != null && otp.matches("^\\d{6}$");
    }
}
