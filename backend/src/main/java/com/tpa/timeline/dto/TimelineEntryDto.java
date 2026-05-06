package com.tpa.timeline.dto;

import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;

import java.time.LocalDateTime;

public record TimelineEntryDto(
        ClaimStage stage,
        ClaimStatus status,
        LocalDateTime timestamp,
        String description
) {
}
