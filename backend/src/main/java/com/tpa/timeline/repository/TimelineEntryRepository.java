package com.tpa.timeline.repository;

import com.tpa.timeline.entity.TimelineEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimelineEntryRepository extends JpaRepository<TimelineEntry, UUID> {

    List<TimelineEntry> findAllByClaim_IdOrderByTimestampAscCreatedAtAsc(UUID claimId);
}
