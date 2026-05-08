package com.tpa.client.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.stream.Stream;

@Service
public class ClientClaimMatchService {

    public boolean matchesPolicyNumber(String ocrPolicyNumber, String expectedPolicyNumber) {
        return hasText(ocrPolicyNumber)
                && hasText(expectedPolicyNumber)
                && normalizeIdentifier(ocrPolicyNumber).equals(normalizeIdentifier(expectedPolicyNumber));
    }

    public boolean matchesPolicyName(String ocrPolicyName, String expectedPolicyName) {
        return hasText(ocrPolicyName)
                && hasText(expectedPolicyName)
                && normalizeText(ocrPolicyName).equals(normalizeText(expectedPolicyName));
    }

    public boolean matchesPolicyHolderName(String expectedCustomerName, String... candidateNames) {
        if (!hasText(expectedCustomerName)) {
            return false;
        }

        String normalizedExpected = normalizeText(expectedCustomerName);
        return Stream.of(candidateNames)
                .filter(this::hasText)
                .map(this::normalizeText)
                .anyMatch(normalizedExpected::equals);
    }

    public String normalizeIdentifier(String value) {
        if (!hasText(value)) {
            return "";
        }

        return stripDiacritics(value)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    public String normalizeText(String value) {
        if (!hasText(value)) {
            return "";
        }

        return stripDiacritics(value)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String stripDiacritics(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "");
    }
}
