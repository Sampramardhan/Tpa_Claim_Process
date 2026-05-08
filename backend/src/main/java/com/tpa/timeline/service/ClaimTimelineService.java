package com.tpa.timeline.service;

import com.tpa.claims.entity.Claim;
import com.tpa.common.enums.ClaimStage;
import com.tpa.common.enums.ClaimStatus;
import com.tpa.timeline.dto.TimelineEntryDto;
import com.tpa.timeline.entity.TimelineEntry;
import com.tpa.timeline.repository.TimelineEntryRepository;
import com.tpa.utils.DateTimeUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ClaimTimelineService {

    private final TimelineEntryRepository timelineEntryRepository;

    public ClaimTimelineService(TimelineEntryRepository timelineEntryRepository) {
        this.timelineEntryRepository = timelineEntryRepository;
    }

    @Transactional
    public TimelineEntry record(Claim claim, ClaimStage stage, ClaimStatus status, String description) {
        TimelineEntry entry = TimelineEntry.builder()
                .claim(claim)
                .stage(stage)
                .status(status)
                .timestamp(DateTimeUtils.nowUtc())
                .description(description)
                .build();

        return timelineEntryRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<TimelineEntryDto> getClaimTimeline(UUID claimId) {
        return timelineEntryRepository.findAllByClaim_IdOrderByTimestampAscCreatedAtAsc(claimId).stream()
                .map(entry -> new TimelineEntryDto(
                        entry.getStage(),
                        entry.getStatus(),
                        entry.getTimestamp(),
                        entry.getDescription()
                ))
                .toList();
    }
}
