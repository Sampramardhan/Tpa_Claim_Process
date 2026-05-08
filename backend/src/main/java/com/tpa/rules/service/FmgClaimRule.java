package com.tpa.rules.service;

import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.FmgRuleTrigger;
import com.tpa.rules.dto.RuleOutcome;

import java.util.Optional;

public interface FmgClaimRule {

    int order();

    String code();

    String name();

    RuleOutcome outcome();

    Optional<FmgRuleTrigger> evaluate(FmgRuleContext context);
}
