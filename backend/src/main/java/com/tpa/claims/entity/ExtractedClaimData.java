package com.tpa.claims.entity;

import com.tpa.claims.enums.OcrStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "extracted_claim_data",
        schema = "claim_schema",
        indexes = {
                @Index(name = "extracted_claim_data_policy_number_idx", columnList = "policy_number"),
                @Index(name = "extracted_claim_data_patient_name_idx", columnList = "patient_name"),
                @Index(name = "extracted_claim_data_ocr_status_idx", columnList = "ocr_status")
        }
)
public class ExtractedClaimData {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, unique = true)
    private Claim claim;

    @Enumerated(EnumType.STRING)
    @Column(name = "ocr_status", nullable = false, length = 30)
    private OcrStatus ocrStatus;

    @Column(name = "ocr_processed_at")
    private LocalDateTime ocrProcessedAt;

    @Column(name = "ocr_failure_reason", length = 2000)
    private String ocrFailureReason;

    @Lob
    @Column(name = "ocr_raw_response")
    private String ocrRawResponse;

    @Column(name = "policy_number", length = 50)
    private String policyNumber;

    @Column(name = "customer_name", length = 150)
    private String customerName;

    @Column(name = "patient_name", length = 150)
    private String patientName;

    @Column(name = "carrier_name", length = 150)
    private String carrierName;

    @Column(name = "policy_name", length = 200)
    private String policyName;

    @Column(name = "hospital_name", length = 200)
    private String hospitalName;

    @Column(name = "admission_date")
    private LocalDate admissionDate;

    @Column(name = "discharge_date")
    private LocalDate dischargeDate;

    @Column(name = "diagnosis", length = 1000)
    private String diagnosis;

    @Column(name = "total_bill_amount", precision = 15, scale = 2)
    private BigDecimal totalBillAmount;

    @Column(name = "claimed_amount", precision = 15, scale = 2)
    private BigDecimal claimedAmount;

    @Column(name = "claim_type", length = 100)
    private String claimType;

    @Column(name = "bill_number", length = 100)
    private String billNumber;

    @Column(name = "bill_date")
    private LocalDate billDate;

    @Column(name = "claim_form_policy_number", length = 50)
    private String claimFormPolicyNumber;

    @Column(name = "claim_form_customer_name", length = 150)
    private String claimFormCustomerName;

    @Column(name = "claim_form_patient_name", length = 150)
    private String claimFormPatientName;

    @Column(name = "claim_form_carrier_name", length = 150)
    private String claimFormCarrierName;

    @Column(name = "claim_form_policy_name", length = 200)
    private String claimFormPolicyName;

    @Column(name = "claim_form_hospital_name", length = 200)
    private String claimFormHospitalName;

    @Column(name = "claim_form_admission_date")
    private LocalDate claimFormAdmissionDate;

    @Column(name = "claim_form_discharge_date")
    private LocalDate claimFormDischargeDate;

    @Column(name = "claim_form_claimed_amount", precision = 15, scale = 2)
    private BigDecimal claimFormClaimedAmount;

    @Column(name = "claim_form_claim_type", length = 100)
    private String claimFormClaimType;

    @Column(name = "claim_form_diagnosis", length = 1000)
    private String claimFormDiagnosis;

    @Column(name = "claim_form_bill_number", length = 100)
    private String claimFormBillNumber;

    @Column(name = "claim_form_bill_date")
    private LocalDate claimFormBillDate;

    @Column(name = "claim_form_total_bill_amount", precision = 15, scale = 2)
    private BigDecimal claimFormTotalBillAmount;

    @Column(name = "hospital_document_policy_number", length = 50)
    private String hospitalDocumentPolicyNumber;

    @Column(name = "hospital_document_customer_name", length = 150)
    private String hospitalDocumentCustomerName;

    @Column(name = "hospital_document_patient_name", length = 150)
    private String hospitalDocumentPatientName;

    @Column(name = "hospital_document_carrier_name", length = 150)
    private String hospitalDocumentCarrierName;

    @Column(name = "hospital_document_policy_name", length = 200)
    private String hospitalDocumentPolicyName;

    @Column(name = "hospital_document_hospital_name", length = 200)
    private String hospitalDocumentHospitalName;

    @Column(name = "hospital_document_admission_date")
    private LocalDate hospitalDocumentAdmissionDate;

    @Column(name = "hospital_document_discharge_date")
    private LocalDate hospitalDocumentDischargeDate;

    @Column(name = "hospital_document_claimed_amount", precision = 15, scale = 2)
    private BigDecimal hospitalDocumentClaimedAmount;

    @Column(name = "hospital_document_claim_type", length = 100)
    private String hospitalDocumentClaimType;

    @Column(name = "hospital_document_diagnosis", length = 1000)
    private String hospitalDocumentDiagnosis;

    @Column(name = "hospital_document_bill_number", length = 100)
    private String hospitalDocumentBillNumber;

    @Column(name = "hospital_document_bill_date")
    private LocalDate hospitalDocumentBillDate;

    @Column(name = "hospital_document_total_bill_amount", precision = 15, scale = 2)
    private BigDecimal hospitalDocumentTotalBillAmount;
}
