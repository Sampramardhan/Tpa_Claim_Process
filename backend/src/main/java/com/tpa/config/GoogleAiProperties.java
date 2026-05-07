package com.tpa.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Google AI services.
 * These values are typically sourced from environment variables.
 */
@ConfigurationProperties(prefix = "tpa.google.ai")
public class GoogleAiProperties {

    /**
     * API key for Google AI Studio (Gemini API).
     */
    private String apiKey;

    /**
     * Base URL for Google AI Studio REST API.
     */
    private String baseUrl = "https://generativelanguage.googleapis.com";

    /**
     * Gemini model used for OCR-backed structured extraction.
     */
    private String model = "gemini-2.5-flash";

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }
}
