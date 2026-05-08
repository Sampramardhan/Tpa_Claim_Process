package com.tpa.fmg.dto;

import com.tpa.common.enums.ClaimStatus;

public record FmgManualReviewRequest(
        ClaimStatus decision,
        String reviewerNotes
) {
}
