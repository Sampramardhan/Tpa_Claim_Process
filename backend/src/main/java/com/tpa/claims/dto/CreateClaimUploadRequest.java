package com.tpa.claims.dto;

import jakarta.validation.constraints.NotNull;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public class CreateClaimUploadRequest {

    @NotNull(message = "Customer policy ID is required.")
    private UUID customerPolicyId;

    private MultipartFile claimForm;

    private MultipartFile hospitalDocument;

    public UUID getCustomerPolicyId() {
        return customerPolicyId;
    }

    public void setCustomerPolicyId(UUID customerPolicyId) {
        this.customerPolicyId = customerPolicyId;
    }

    public MultipartFile getClaimForm() {
        return claimForm;
    }

    public void setClaimForm(MultipartFile claimForm) {
        this.claimForm = claimForm;
    }

    public MultipartFile getHospitalDocument() {
        return hospitalDocument;
    }

    public void setHospitalDocument(MultipartFile hospitalDocument) {
        this.hospitalDocument = hospitalDocument;
    }
}
