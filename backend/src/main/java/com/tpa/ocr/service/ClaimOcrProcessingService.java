package com.tpa.ocr.service;

import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.OcrStatus;
import com.tpa.claims.repository.ClaimDocumentRepository;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.claims.repository.ExtractedClaimDataRepository;
import com.tpa.claims.service.ClaimFileStorageService;
import com.tpa.exception.ResourceNotFoundException;
import com.tpa.ocr.dto.ClaimOcrClientResponse;
import com.tpa.ocr.dto.ClaimOcrExtractionResult;
import com.tpa.ocr.dto.ClaimOcrSourceDocument;
import com.tpa.utils.DateTimeUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

@Service
public class ClaimOcrProcessingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClaimOcrProcessingService.class);

    private final ClaimRepository claimRepository;
    private final ClaimDocumentRepository claimDocumentRepository;
    private final ExtractedClaimDataRepository extractedClaimDataRepository;
    private final ClaimFileStorageService claimFileStorageService;
    private final GoogleAiStudioClaimOcrClient googleAiStudioClaimOcrClient;
    private final TransactionTemplate transactionTemplate;

    public ClaimOcrProcessingService(
            ClaimRepository claimRepository,
            ClaimDocumentRepository claimDocumentRepository,
            ExtractedClaimDataRepository extractedClaimDataRepository,
            ClaimFileStorageService claimFileStorageService,
            GoogleAiStudioClaimOcrClient googleAiStudioClaimOcrClient,
            PlatformTransactionManager transactionManager
    ) {
        this.claimRepository = claimRepository;
        this.claimDocumentRepository = claimDocumentRepository;
        this.extractedClaimDataRepository = extractedClaimDataRepository;
        this.claimFileStorageService = claimFileStorageService;
        this.googleAiStudioClaimOcrClient = googleAiStudioClaimOcrClient;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void processClaim(UUID claimId) {
        boolean started = Boolean.TRUE.equals(transactionTemplate.execute(status ->
                extractedClaimDataRepository.updateOcrStatusIfCurrent(
                        claimId,
                        OcrStatus.PENDING,
                        OcrStatus.PROCESSING
                ) > 0
        ));

        if (!started) {
            LOGGER.info("Skipping OCR for claim {} because it is no longer pending.", claimId);
            return;
        }

        String rawResponse = null;

        try {
            OcrContext ocrContext = transactionTemplate.execute(status -> loadOcrContext(claimId));
            ClaimOcrClientResponse clientResponse = googleAiStudioClaimOcrClient.extractClaimData(ocrContext.documents());
            rawResponse = clientResponse.rawResponse();
            ClaimOcrExtractionResult extractionResult = clientResponse.extractionResult();
            String responseSnapshot = rawResponse;

            transactionTemplate.executeWithoutResult(status ->
                    persistSuccess(claimId, extractionResult, responseSnapshot)
            );
        } catch (RuntimeException exception) {
            LOGGER.warn("OCR processing failed for claim {}: {}", claimId, exception.getMessage());
            String failureReason = exception.getMessage() == null
                    ? "OCR processing failed."
                    : exception.getMessage();

            String responseSnapshot = rawResponse;
            transactionTemplate.executeWithoutResult(status ->
                    persistFailure(claimId, responseSnapshot, failureReason)
            );
        }
    }

    private OcrContext loadOcrContext(UUID claimId) {
        Claim claim = claimRepository.findByIdWithPolicyDetails(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Claim not found for OCR."));

        List<ClaimOcrSourceDocument> documents = claimDocumentRepository.findAllByClaim_IdOrderByUploadedAtAsc(claimId)
                .stream()
                .map(this::toOcrSourceDocument)
                .toList();

        if (documents.isEmpty()) {
            throw new ResourceNotFoundException("No uploaded claim documents were found for OCR.");
        }

        return new OcrContext(claim.getClaimNumber(), documents);
    }

    private ClaimOcrSourceDocument toOcrSourceDocument(ClaimDocument document) {
        return new ClaimOcrSourceDocument(
                document.getDocumentType(),
                document.getOriginalFileName(),
                document.getStoredFileName(),
                claimFileStorageService.resolveMimeType(document.getStoredFileName()),
                claimFileStorageService.readStoredFile(document.getStoredFilePath())
        );
    }

    private void persistSuccess(UUID claimId, ClaimOcrExtractionResult result, String rawResponse) {
        ExtractedClaimData extractedClaimData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Extracted claim data row not found."));

        extractedClaimData.setOcrStatus(OcrStatus.COMPLETED);
        extractedClaimData.setOcrProcessedAt(DateTimeUtils.nowUtc());
        extractedClaimData.setOcrFailureReason(null);
        extractedClaimData.setOcrRawResponse(rawResponse);
        extractedClaimData.setPolicyNumber(result.policyNumber());
        extractedClaimData.setCustomerName(result.customerName());
        extractedClaimData.setPatientName(result.patientName());
        extractedClaimData.setCarrierName(result.carrierName());
        extractedClaimData.setPolicyName(result.policyName());
        extractedClaimData.setHospitalName(result.hospitalName());
        extractedClaimData.setAdmissionDate(result.admissionDate());
        extractedClaimData.setDischargeDate(result.dischargeDate());
        extractedClaimData.setClaimedAmount(result.claimedAmount());
        extractedClaimData.setClaimType(result.claimType());
        extractedClaimData.setDiagnosis(result.diagnosis());
        extractedClaimData.setBillNumber(result.billNumber());
        extractedClaimData.setBillDate(result.billDate());
        extractedClaimData.setTotalBillAmount(result.totalBillAmount());
        extractedClaimDataRepository.save(extractedClaimData);
    }

    private void persistFailure(UUID claimId, String rawResponse, String failureReason) {
        ExtractedClaimData extractedClaimData = extractedClaimDataRepository.findByClaim_Id(claimId)
                .orElseThrow(() -> new ResourceNotFoundException("Extracted claim data row not found."));

        extractedClaimData.setOcrStatus(OcrStatus.FAILED);
        extractedClaimData.setOcrProcessedAt(DateTimeUtils.nowUtc());
        extractedClaimData.setOcrFailureReason(failureReason);
        extractedClaimData.setOcrRawResponse(rawResponse);
        extractedClaimDataRepository.save(extractedClaimData);
    }

    private record OcrContext(
            String claimNumber,
            List<ClaimOcrSourceDocument> documents
    ) {
    }
}
