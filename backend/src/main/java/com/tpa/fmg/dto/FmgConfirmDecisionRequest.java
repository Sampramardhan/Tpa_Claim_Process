package com.tpa.fmg.dto;

import com.tpa.common.enums.ClaimStatus;

public record FmgConfirmDecisionRequest(
        ClaimStatus decision
) {
}
