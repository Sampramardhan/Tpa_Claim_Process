package com.tpa.claims.service;

import com.tpa.claims.dto.ClaimDocumentResponse;
import com.tpa.claims.dto.ClaimResponse;
import com.tpa.claims.dto.ExtractedClaimDataResponse;
import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.entity.TimelineEntry;
import org.springframework.stereotype.Component;

@Component
public class ClaimResponseMapper {

    public ClaimResponse toClaimResponse(Claim claim) {
        return new ClaimResponse(
                claim.getId(),
                claim.getClaimNumber(),
                claim.getCustomer().getId(),
                claim.getCustomer().getFullName(),
                claim.getCustomer().getEmail(),
                claim.getCustomerPolicy().getId(),
                claim.getCustomerPolicy().getUniquePolicyNumber(),
                claim.getCustomerPolicy().getPolicy().getPolicyName(),
                claim.getCustomerPolicy().getPolicy().getCarrier().getCarrierName(),
                claim.getExtractedClaimData() == null ? null : claim.getExtractedClaimData().getOcrStatus(),
                claim.getStatus(),
                claim.getStage(),
                claim.getSubmissionDate(),
                claim.getCreatedAt(),
                claim.getUpdatedAt()
        );
    }

    public ClaimDocumentResponse toClaimDocumentResponse(ClaimDocument document) {
        return new ClaimDocumentResponse(
                document.getId(),
                document.getClaim().getId(),
                document.getDocumentType(),
                document.getOriginalFileName(),
                document.getStoredFileName(),
                document.getStoredFilePath(),
                document.getUploadedAt()
        );
    }

    public ExtractedClaimDataResponse toExtractedClaimDataResponse(ExtractedClaimData data) {
        return new ExtractedClaimDataResponse(
                data.getId(),
                data.getClaim().getId(),
                data.getOcrStatus(),
                data.getOcrProcessedAt(),
                data.getOcrFailureReason(),
                data.getPolicyNumber(),
                data.getCustomerName(),
                data.getPatientName(),
                data.getCarrierName(),
                data.getPolicyName(),
                data.getHospitalName(),
                data.getAdmissionDate(),
                data.getDischargeDate(),
                data.getClaimType(),
                data.getDiagnosis(),
                data.getBillNumber(),
                data.getBillDate(),
                data.getTotalBillAmount(),
                data.getClaimedAmount()
        );
    }

    public TimelineEntryDto toTimelineEntryDto(TimelineEntry entry) {
        return new TimelineEntryDto(
                entry.getStage(),
                entry.getStatus(),
                entry.getTimestamp(),
                entry.getDescription()
        );
    }
}
