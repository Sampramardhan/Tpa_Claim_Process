package com.tpa.ocr.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tpa.config.GoogleAiProperties;
import com.tpa.exception.FileStorageException;
import com.tpa.ocr.dto.ClaimOcrClientResponse;
import com.tpa.ocr.dto.ClaimOcrExtractionResult;
import com.tpa.ocr.dto.ClaimOcrSourceDocument;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Base64;
import java.util.List;

@Service
public class GoogleAiStudioClaimOcrClient {

    private static final String EXTRACTION_PROMPT = """
            You are processing two uploaded insurance claim documents.
            Extract only the structured fields requested below and return valid JSON that matches the provided schema.

            Document expectations:
            - Claim Form: policyNumber, customerName, patientName, carrierName, policyName, hospitalName,
              admissionDate, dischargeDate, claimedAmount, claimType.
            - Combined Hospital Document: patientName, hospitalName, admissionDate, dischargeDate,
              diagnosis, billNumber, billDate, totalBillAmount.

            Rules:
            - Use null when a field is missing or unreadable.
            - Normalize dates to yyyy-MM-dd.
            - Normalize monetary values as plain numbers without currency symbols or commas.
            - Prefer the clearest value when the same field appears in multiple places.
            - Do not invent values that are not visible in the documents.
            """;

    private final GoogleAiProperties googleAiProperties;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public GoogleAiStudioClaimOcrClient(
            GoogleAiProperties googleAiProperties,
            ObjectMapper objectMapper
    ) {
        this.googleAiProperties = googleAiProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(googleAiProperties.getBaseUrl())
                .defaultHeader("x-goog-api-key", googleAiProperties.getApiKey())
                .build();
    }

    public ClaimOcrClientResponse extractClaimData(List<ClaimOcrSourceDocument> documents) {
        if (!StringUtils.hasText(googleAiProperties.getApiKey())) {
            throw new FileStorageException("Google AI API key is not configured for OCR extraction.");
        }

        ObjectNode requestBody = buildRequestBody(documents);

        try {
            String rawResponse = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent", googleAiProperties.getModel())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (!StringUtils.hasText(rawResponse)) {
                throw new FileStorageException("Google AI returned an empty OCR response.");
            }

            JsonNode responseNode = objectMapper.readTree(rawResponse);
            String extractedJson = responseNode.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText(null);

            if (!StringUtils.hasText(extractedJson)) {
                throw new FileStorageException("Google AI did not return structured OCR content.");
            }

            extractedJson = stripMarkdownCodeFence(extractedJson);

            ClaimOcrExtractionResult extractionResult = objectMapper.readValue(
                    extractedJson,
                    ClaimOcrExtractionResult.class
            );

            return new ClaimOcrClientResponse(extractionResult, rawResponse);
        } catch (JsonProcessingException exception) {
            throw new FileStorageException("Unable to parse Google AI OCR response.", exception.getOriginalMessage());
        } catch (RestClientException exception) {
            throw new FileStorageException("Google AI OCR request failed.", exception.getMessage());
        }
    }

    private ObjectNode buildRequestBody(List<ClaimOcrSourceDocument> documents) {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contents = root.putArray("contents");
        ObjectNode content = contents.addObject();
        ArrayNode parts = content.putArray("parts");
        parts.addObject().put("text", EXTRACTION_PROMPT);

        for (ClaimOcrSourceDocument document : documents) {
            parts.addObject().put("text", "Document type: " + document.documentType().name());
            ObjectNode inlineData = parts.addObject().putObject("inlineData");
            inlineData.put("mimeType", document.mimeType());
            inlineData.put("data", Base64.getEncoder().encodeToString(document.fileBytes()));
        }

        ObjectNode generationConfig = root.putObject("generationConfig");
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("temperature", 0);
        generationConfig.set("responseJsonSchema", buildResponseSchema());
        return root;
    }

    private ObjectNode buildResponseSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode properties = schema.putObject("properties");

        addNullableString(properties, "policyNumber");
        addNullableString(properties, "customerName");
        addNullableString(properties, "patientName");
        addNullableString(properties, "carrierName");
        addNullableString(properties, "policyName");
        addNullableString(properties, "hospitalName");
        addNullableDate(properties, "admissionDate");
        addNullableDate(properties, "dischargeDate");
        addNullableNumber(properties, "claimedAmount");
        addNullableString(properties, "claimType");
        addNullableString(properties, "diagnosis");
        addNullableString(properties, "billNumber");
        addNullableDate(properties, "billDate");
        addNullableNumber(properties, "totalBillAmount");
        return schema;
    }

    private void addNullableString(ObjectNode properties, String fieldName) {
        ArrayNode types = properties.putObject(fieldName).putArray("type");
        types.add("string");
        types.add("null");
    }

    private void addNullableDate(ObjectNode properties, String fieldName) {
        ObjectNode node = properties.putObject(fieldName);
        ArrayNode types = node.putArray("type");
        types.add("string");
        types.add("null");
        node.put("format", "date");
    }

    private void addNullableNumber(ObjectNode properties, String fieldName) {
        ArrayNode types = properties.putObject(fieldName).putArray("type");
        types.add("number");
        types.add("null");
    }

    private String stripMarkdownCodeFence(String value) {
        String trimmed = value.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        int firstLineBreak = trimmed.indexOf('\n');
        int lastFence = trimmed.lastIndexOf("```");
        if (firstLineBreak < 0 || lastFence <= firstLineBreak) {
            return trimmed;
        }

        return trimmed.substring(firstLineBreak + 1, lastFence).trim();
    }
}
