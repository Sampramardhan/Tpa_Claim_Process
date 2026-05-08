package com.tpa.fmg.dto;

import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record FmgManualReviewResponse(
        UUID id,
        ClaimStatus manualDecision,
        String reviewerNotes,
        ClaimStatus statusAfterDecision,
        ClaimStage stageAfterDecision,
        LocalDateTime reviewedAt,
        String reviewedBy,
        boolean reviewed
) {
}
