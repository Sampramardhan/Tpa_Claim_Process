package com.tpa.ocr.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.config.GoogleAiProperties;
import com.tpa.ocr.dto.ClaimOcrClientResponse;
import com.tpa.ocr.dto.ClaimOcrExtractionResult;
import com.tpa.ocr.dto.ClaimOcrSourceDocument;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GoogleAiStudioClaimOcrClientTests {

    @Test
    void extractClaimDataProcessesBothDocumentTypesAndMergesTheResult() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper()
                .findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Map<ClaimDocumentType, ClaimOcrClientResponse> stubResponses = new EnumMap<>(ClaimDocumentType.class);
        stubResponses.put(
                ClaimDocumentType.CLAIM_FORM,
                new ClaimOcrClientResponse(
                        new ClaimOcrExtractionResult(
                                "POL-555",
                                "Neha Verma",
                                "Arjun Verma",
                                "Acme Health",
                                "Premium Plus",
                                "Claim Form Hospital",
                                null,
                                null,
                                new BigDecimal("8700.00"),
                                "Reimbursement",
                                null,
                                null,
                                null,
                                null
                        ),
                        "{\"source\":\"claim-form\"}"
                )
        );
        stubResponses.put(
                ClaimDocumentType.HOSPITAL_DOCUMENT,
                new ClaimOcrClientResponse(
                        new ClaimOcrExtractionResult(
                                null,
                                null,
                                "Hospital Patient",
                                null,
                                null,
                                "Metro Hospital",
                                LocalDate.of(2026, 2, 14),
                                LocalDate.of(2026, 2, 17),
                                null,
                                null,
                                "Viral fever",
                                "INV-204",
                                LocalDate.of(2026, 2, 18),
                                new BigDecimal("9800.00")
                        ),
                        "{\"source\":\"hospital-document\"}"
                )
        );

        RecordingGoogleAiStudioClaimOcrClient client = new RecordingGoogleAiStudioClaimOcrClient(
                configuredProperties(),
                objectMapper,
                stubResponses
        );

        ClaimOcrClientResponse response = client.extractClaimData(List.of(
                buildDocument(ClaimDocumentType.CLAIM_FORM, "claim-form.pdf"),
                buildDocument(ClaimDocumentType.HOSPITAL_DOCUMENT, "hospital.pdf")
        ));

        assertEquals(
                List.of(ClaimDocumentType.CLAIM_FORM, ClaimDocumentType.HOSPITAL_DOCUMENT),
                client.processedDocumentTypes()
        );
        assertEquals(1, client.processedDocuments().get(ClaimDocumentType.CLAIM_FORM).size());
        assertEquals(1, client.processedDocuments().get(ClaimDocumentType.HOSPITAL_DOCUMENT).size());

        ClaimOcrExtractionResult mergedResult = response.extractionResult();
        assertEquals("POL-555", mergedResult.policyNumber());
        assertEquals("Neha Verma", mergedResult.customerName());
        assertEquals("Arjun Verma", mergedResult.patientName());
        assertEquals("Acme Health", mergedResult.carrierName());
        assertEquals("Premium Plus", mergedResult.policyName());
        assertEquals("Metro Hospital", mergedResult.hospitalName());
        assertEquals(LocalDate.of(2026, 2, 14), mergedResult.admissionDate());
        assertEquals(LocalDate.of(2026, 2, 17), mergedResult.dischargeDate());
        assertEquals(new BigDecimal("8700.00"), mergedResult.claimedAmount());
        assertEquals("Reimbursement", mergedResult.claimType());
        assertEquals("Viral fever", mergedResult.diagnosis());
        assertEquals("INV-204", mergedResult.billNumber());
        assertEquals(LocalDate.of(2026, 2, 18), mergedResult.billDate());
        assertEquals(new BigDecimal("9800.00"), mergedResult.totalBillAmount());

        JsonNode rawResponse = objectMapper.readTree(response.rawResponse());
        assertEquals(2, rawResponse.path("documentResponses").size());
        assertEquals("CLAIM_FORM", rawResponse.path("documentResponses").path(0).path("documentType").asText());
        assertEquals("HOSPITAL_DOCUMENT", rawResponse.path("documentResponses").path(1).path("documentType").asText());
        assertEquals("Metro Hospital", rawResponse.path("mergedExtractionResult").path("hospitalName").asText());
    }

    private GoogleAiProperties configuredProperties() {
        GoogleAiProperties properties = new GoogleAiProperties();
        properties.setApiKey("test-api-key");
        return properties;
    }

    private ClaimOcrSourceDocument buildDocument(ClaimDocumentType documentType, String fileName) {
        return new ClaimOcrSourceDocument(
                documentType,
                fileName,
                fileName,
                "application/pdf",
                fileName.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static final class RecordingGoogleAiStudioClaimOcrClient extends GoogleAiStudioClaimOcrClient {

        private final Map<ClaimDocumentType, ClaimOcrClientResponse> stubResponses;
        private final List<ClaimDocumentType> processedDocumentTypes = new ArrayList<>();
        private final Map<ClaimDocumentType, List<ClaimOcrSourceDocument>> processedDocuments =
                new EnumMap<>(ClaimDocumentType.class);

        private RecordingGoogleAiStudioClaimOcrClient(
                GoogleAiProperties googleAiProperties,
                ObjectMapper objectMapper,
                Map<ClaimDocumentType, ClaimOcrClientResponse> stubResponses
        ) {
            super(googleAiProperties, objectMapper);
            this.stubResponses = stubResponses;
        }

        @Override
        protected ClaimOcrClientResponse extractStructuredDocumentData(
                ClaimDocumentType documentType,
                List<ClaimOcrSourceDocument> documents
        ) {
            processedDocumentTypes.add(documentType);
            processedDocuments.put(documentType, List.copyOf(documents));
            return stubResponses.get(documentType);
        }

        private List<ClaimDocumentType> processedDocumentTypes() {
            return processedDocumentTypes;
        }

        private Map<ClaimDocumentType, List<ClaimOcrSourceDocument>> processedDocuments() {
            return processedDocuments;
        }
    }
}
