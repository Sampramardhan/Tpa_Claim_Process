package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleTrigger;

import java.util.Optional;

abstract class AbstractFmgClaimRule implements FmgClaimRule {

    protected Optional<FmgRuleTrigger> trigger(String message) {
        return Optional.of(new FmgRuleTrigger(code(), name(), order(), outcome(), message));
    }

    protected Optional<FmgRuleTrigger> noTrigger() {
        return Optional.empty();
    }
}
