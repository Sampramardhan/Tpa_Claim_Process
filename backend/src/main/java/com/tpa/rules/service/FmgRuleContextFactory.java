package com.tpa.rules.service;

import com.tpa.claims.entity.Claim;
import com.tpa.claims.entity.ClaimDocument;
import com.tpa.claims.entity.ExtractedClaimData;
import com.tpa.claims.enums.ClaimDocumentType;
import com.tpa.claims.repository.ClaimRepository;
import com.tpa.client.service.ClientClaimMatchService;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.rules.dto.FmgRuleContext;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class FmgRuleContextFactory {

    private final ClaimRepository claimRepository;
    private final ClientClaimMatchService clientClaimMatchService;

    public FmgRuleContextFactory(
            ClaimRepository claimRepository,
            ClientClaimMatchService clientClaimMatchService
    ) {
        this.claimRepository = claimRepository;
        this.clientClaimMatchService = clientClaimMatchService;
    }

    public FmgRuleContext create(Claim claim, List<ClaimDocument> documents) {
        Set<ClaimDocumentType> availableDocumentTypes = documents.stream()
                .map(ClaimDocument::getDocumentType)
                .collect(() -> EnumSet.noneOf(ClaimDocumentType.class), Set::add, Set::addAll);

        return new FmgRuleContext(
                claim,
                claim.getExtractedClaimData(),
                availableDocumentTypes,
                claim.getCustomer() == null ? null : claim.getCustomer().getFullName(),
                resolvePossibleDuplicateClaimNumbers(claim)
        );
    }

    private List<String> resolvePossibleDuplicateClaimNumbers(Claim claim) {
        if (claim.getCustomerPolicy() == null || claim.getCustomerPolicy().getId() == null) {
            return List.of();
        }

        ExtractedClaimData currentData = claim.getExtractedClaimData();
        if (currentData == null) {
            return List.of();
        }

        String currentBillNumber = resolveBillNumber(currentData);
        String currentPatientName = resolveIdentityName(currentData);
        LocalDate currentAdmissionDate = resolveAdmissionDate(currentData);
        LocalDate currentDischargeDate = resolveDischargeDate(currentData);

        List<Claim> candidates = claimRepository.findDuplicateCandidatesByCustomerPolicyId(
                claim.getCustomerPolicy().getId(),
                claim.getId()
        );

        LinkedHashSet<String> duplicateClaimNumbers = new LinkedHashSet<>();
        for (Claim candidate : candidates) {
            if (candidate.getStatus() == ClaimStatus.DRAFT || candidate.getExtractedClaimData() == null) {
                continue;
            }

            ExtractedClaimData candidateData = candidate.getExtractedClaimData();
            boolean sameBillNumber = sameIdentifier(currentBillNumber, resolveBillNumber(candidateData));
            boolean samePatientAndStay = samePatientAndStay(
                    currentPatientName,
                    currentAdmissionDate,
                    currentDischargeDate,
                    candidateData
            );

            if (sameBillNumber || samePatientAndStay) {
                duplicateClaimNumbers.add(candidate.getClaimNumber());
            }
        }

        return new ArrayList<>(duplicateClaimNumbers);
    }

    private boolean samePatientAndStay(
            String currentPatientName,
            LocalDate currentAdmissionDate,
            LocalDate currentDischargeDate,
            ExtractedClaimData candidateData
    ) {
        return clientClaimMatchService.hasText(currentPatientName)
                && clientClaimMatchService.hasText(resolveIdentityName(candidateData))
                && currentAdmissionDate != null
                && currentDischargeDate != null
                && currentAdmissionDate.equals(resolveAdmissionDate(candidateData))
                && currentDischargeDate.equals(resolveDischargeDate(candidateData))
                && clientClaimMatchService.normalizeText(currentPatientName)
                .equals(clientClaimMatchService.normalizeText(resolveIdentityName(candidateData)));
    }

    private boolean sameIdentifier(String left, String right) {
        return clientClaimMatchService.hasText(left)
                && clientClaimMatchService.hasText(right)
                && clientClaimMatchService.normalizeIdentifier(left)
                .equals(clientClaimMatchService.normalizeIdentifier(right));
    }

    private String resolveIdentityName(ExtractedClaimData data) {
        return firstNonBlank(
                data.getPatientName(),
                data.getHospitalDocumentPatientName(),
                data.getClaimFormPatientName(),
                data.getCustomerName(),
                data.getClaimFormCustomerName(),
                data.getHospitalDocumentCustomerName()
        );
    }

    private LocalDate resolveAdmissionDate(ExtractedClaimData data) {
        return firstNonNull(
                data.getAdmissionDate(),
                data.getHospitalDocumentAdmissionDate(),
                data.getClaimFormAdmissionDate()
        );
    }

    private LocalDate resolveDischargeDate(ExtractedClaimData data) {
        return firstNonNull(
                data.getDischargeDate(),
                data.getHospitalDocumentDischargeDate(),
                data.getClaimFormDischargeDate()
        );
    }

    private String resolveBillNumber(ExtractedClaimData data) {
        return firstNonBlank(
                data.getBillNumber(),
                data.getHospitalDocumentBillNumber(),
                data.getClaimFormBillNumber()
        );
    }

    @SafeVarargs
    private static <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
