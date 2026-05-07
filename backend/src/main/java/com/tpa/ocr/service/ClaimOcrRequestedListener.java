package com.tpa.ocr.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ClaimOcrRequestedListener {

    private final ClaimOcrProcessingService claimOcrProcessingService;

    public ClaimOcrRequestedListener(ClaimOcrProcessingService claimOcrProcessingService) {
        this.claimOcrProcessingService = claimOcrProcessingService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(ClaimOcrRequestedEvent event) {
        claimOcrProcessingService.processClaim(event.claimId());
    }
}
