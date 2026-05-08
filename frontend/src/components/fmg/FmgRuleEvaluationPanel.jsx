import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge.jsx';

const RULE_CATALOG = [
  {
    code: 'RULE_1',
    name: 'Missing claim form',
    outcome: 'REJECT',
    description: 'Reject if the uploaded claim form is missing.',
  },
  {
    code: 'RULE_2',
    name: 'Missing hospital document',
    outcome: 'REJECT',
    description: 'Reject if the hospital document is missing.',
  },
  {
    code: 'RULE_3',
    name: 'Policy inactive during admission date',
    outcome: 'REJECT',
    description: 'Reject if admission falls outside the active policy window.',
  },
  {
    code: 'RULE_4',
    name: 'Policy number missing',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when policy number cannot be confirmed from OCR data.',
  },
  {
    code: 'RULE_5',
    name: 'Patient/customer mismatch across sources',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when claim form, hospital document, and registered customer do not align.',
  },
  {
    code: 'RULE_6',
    name: 'Hospital name mismatch',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when hospital name differs across uploaded documents.',
  },
  {
    code: 'RULE_7',
    name: 'Admission or discharge date mismatch',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when stay dates differ across uploaded documents.',
  },
  {
    code: 'RULE_8',
    name: 'Claimed amount exceeds bill amount',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when claimed amount is greater than the billed amount.',
  },
  {
    code: 'RULE_9',
    name: 'Claim amount exceeds threshold',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when the claim amount is greater than 50000.',
  },
  {
    code: 'RULE_10',
    name: 'Possible duplicate claim',
    outcome: 'MANUAL_REVIEW',
    description: 'Escalate when the backend flags a possible duplicate claim.',
  },
];

const DECISION_VARIANTS = {
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'pending',
};

const OUTCOME_VARIANTS = {
  REJECT: 'expired',
  MANUAL_REVIEW: 'pending',
};

function formatDateTime(value) {
  if (!value) {
    return 'Pending';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function humanize(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildReasoning(decision, triggeredRules) {
  if (!decision) {
    return 'Run FMG evaluation to generate the deterministic rule summary and recommendation.';
  }

  if (!triggeredRules.length) {
    return 'No blocking or escalation rules were triggered. The claim is ready for FMG approval confirmation.';
  }

  if (decision.recommendedDecision === 'REJECTED') {
    return 'At least one hard reject rule fired, so the engine recommends rejecting the claim.';
  }

  if (decision.recommendedDecision === 'MANUAL_REVIEW') {
    return 'Reject rules did not fire, but one or more escalation checks require FMG manual review confirmation.';
  }

  return 'The rule engine completed without blocking issues.';
}

function FmgRuleEvaluationPanel({ decision, evaluating = false, disabled = false, onEvaluate }) {
  const triggeredRules = decision?.triggeredRules || [];
  const triggeredByCode = new Map(triggeredRules.map((rule) => [rule.code, rule]));
  const passedCount = decision ? RULE_CATALOG.length - triggeredRules.length : 0;
  const reasoning = buildReasoning(decision, triggeredRules);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rule Evaluation</h4>
          <p className="text-sm font-bold text-slate-800">FMG Deterministic Decision Engine</p>
        </div>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={evaluating || disabled}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {evaluating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          {decision ? 'Re-run Evaluation' : 'Run Evaluation'}
        </button>
      </div>

      {decision ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Recommended Decision"
              value={humanize(decision.recommendedDecision)}
              badge={
                <StatusBadge variant={DECISION_VARIANTS[decision.recommendedDecision] || 'info'}>
                  {humanize(decision.recommendedDecision)}
                </StatusBadge>
              }
            />
            <SummaryTile label="Triggered Rules" value={String(triggeredRules.length)} />
            <SummaryTile label="Passed Checks" value={String(passedCount)} />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-start gap-3">
              {triggeredRules.length ? (
                <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">Evaluation Summary</p>
                  <p className="text-xs text-slate-500">
                    Evaluated by {decision.evaluatedBy || 'FMG reviewer'} on {formatDateTime(decision.evaluatedAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-600">{reasoning}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">Triggered Rules Returned By Backend</p>
            </div>
            {triggeredRules.length ? (
              <div className="divide-y divide-slate-100">
                {triggeredRules.map((rule) => (
                  <div key={rule.code} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={OUTCOME_VARIANTS[rule.outcome] || 'info'}>{humanize(rule.outcome)}</StatusBadge>
                      <span className="font-mono text-xs font-semibold text-slate-500">{rule.code}</span>
                      <p className="text-sm font-semibold text-ink-900">{rule.name}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{rule.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No rules were triggered. All deterministic checks passed.
              </div>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">Rule Checklist</p>
            </div>
            <div className="divide-y divide-slate-100">
              {RULE_CATALOG.map((rule) => {
                const trigger = triggeredByCode.get(rule.code);
                const rowState = !decision
                  ? 'border-slate-200 bg-white'
                  : trigger
                    ? rule.outcome === 'REJECT'
                      ? 'border-red-200 bg-red-50/60'
                      : 'border-amber-200 bg-amber-50/60'
                    : 'border-emerald-200 bg-emerald-50/40';

                return (
                  <div key={rule.code} className={`px-4 py-3 ${rowState}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">{rule.code}</span>
                      <p className="text-sm font-semibold text-ink-900">{rule.name}</p>
                      <StatusBadge variant={OUTCOME_VARIANTS[rule.outcome] || 'info'}>{humanize(rule.outcome)}</StatusBadge>
                      {decision ? (
                        <StatusBadge variant={trigger ? (rule.outcome === 'REJECT' ? 'expired' : 'pending') : 'active'}>
                          {trigger ? 'Triggered' : 'Pass'}
                        </StatusBadge>
                      ) : (
                        <StatusBadge variant="info">Pending</StatusBadge>
                      )}
                    </div>
                    <div className="mt-2 flex gap-3">
                      {decision ? (
                        trigger ? (
                          rule.outcome === 'REJECT' ? (
                            <XCircle className="mt-0.5 h-4 w-4 flex-none text-red-600" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                          )
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                        )
                      ) : (
                        <FileSearch className="mt-0.5 h-4 w-4 flex-none text-slate-400" />
                      )}
                      <p className="text-sm text-slate-600">{trigger?.message || rule.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          FMG evaluation has not been run yet for this claim.
        </div>
      )}
    </section>
  );
}

function SummaryTile({ label, value, badge = null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink-900">{value}</p>
        {badge}
      </div>
    </div>
  );
}

export default FmgRuleEvaluationPanel;
