package com.tpa.rules.service;

import com.tpa.common.enums.ClaimStatus;
import com.tpa.rules.dto.FmgRuleContext;
import com.tpa.rules.dto.FmgRuleEvaluationResult;
import com.tpa.rules.dto.FmgRuleTrigger;
import com.tpa.rules.dto.RuleOutcome;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class FmgRuleEngineService {

    private final List<FmgClaimRule> rules;

    public FmgRuleEngineService(List<FmgClaimRule> rules) {
        this.rules = rules.stream()
                .sorted(Comparator.comparingInt(FmgClaimRule::order))
                .toList();
    }

    public FmgRuleEvaluationResult evaluate(FmgRuleContext context) {
        List<FmgRuleTrigger> triggeredRules = rules.stream()
                .map(rule -> rule.evaluate(context))
                .flatMap(Optional::stream)
                .toList();

        ClaimStatus decision = ClaimStatus.APPROVED;
        if (triggeredRules.stream().anyMatch(rule -> rule.outcome() == RuleOutcome.REJECT)) {
            decision = ClaimStatus.REJECTED;
        } else if (!triggeredRules.isEmpty()) {
            decision = ClaimStatus.MANUAL_REVIEW;
        }

        return new FmgRuleEvaluationResult(decision, triggeredRules);
    }
}
