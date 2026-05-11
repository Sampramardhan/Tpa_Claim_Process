import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardEdit, RefreshCw, XCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge.jsx';

const DECISION_VARIANTS = {
  APPROVED: 'active',
  REJECTED: 'expired',
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

function FmgManualReviewPanel({ manualReview, fmgDecision, actionLoading = '', onSubmit }) {
  const [notes, setNotes] = useState('');
  const [showRules, setShowRules] = useState(false);
  const isReviewed = Boolean(manualReview?.reviewed);
  const hasEvaluation = Boolean(fmgDecision?.recommendedDecision);
  const notesCharCount = notes.length;
  const isNotesValid = notes.trim().length > 0 && notes.length <= 2000;

  function handleSubmit(decision) {
    if (!isNotesValid) {
      return;
    }
    onSubmit(decision, notes);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <ClipboardEdit className="h-5 w-5 text-indigo-600" />
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Manual Review</h4>
          <p className="text-sm font-bold text-slate-800">FMG Manual Decision</p>
        </div>
      </div>

      {hasEvaluation ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-ink-900">Previous Evaluation Result</p>
            <StatusBadge variant={DECISION_VARIANTS[fmgDecision.recommendedDecision] || 'info'}>
              {humanize(fmgDecision.recommendedDecision)}
            </StatusBadge>
            {fmgDecision.confirmed ? <StatusBadge variant="active">Confirmed</StatusBadge> : null}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            The rule engine flagged this claim for manual review. {fmgDecision.triggeredRules?.length || 0} rule(s) were
            triggered. Please inspect the claim details, documents, and triggered rules before making a final decision.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Evaluated by {fmgDecision.evaluatedBy || 'FMG reviewer'} on {formatDateTime(fmgDecision.evaluatedAt)}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-850 transition"
            >
              <span>{showRules ? 'Hide Rule Checklist & Diagnostics' : 'Show Rule Checklist & Diagnostics'}</span>
              <span className="text-xs">{showRules ? '▲' : '▼'}</span>
            </button>

            {showRules && (
              <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3 max-h-[320px] overflow-y-auto pr-1">
                {RULE_CATALOG.map((rule) => {
                  const trigger = fmgDecision.triggeredRules?.find(tr => tr.code === rule.code);
                  const isReject = rule.outcome === 'REJECT';

                  return (
                    <div
                      key={rule.code}
                      className={`rounded-xl border p-3 transition-all duration-200 text-xs bg-white ${
                        trigger
                          ? isReject
                            ? 'border-red-200 bg-red-50/30'
                            : 'border-amber-200 bg-amber-50/30'
                          : 'border-emerald-100 bg-emerald-50/10'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            trigger
                              ? isReject
                                ? 'text-red-600 bg-red-50 border border-red-100'
                                : 'text-amber-600 bg-amber-50 border border-amber-100'
                              : 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                          }`}>
                            {rule.code}
                          </span>
                          <p className="font-bold text-slate-850">{rule.name}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          trigger
                            ? isReject
                              ? 'text-red-700 bg-red-100/60 border border-red-200/40'
                              : 'text-amber-700 bg-amber-100/60 border border-amber-200/40'
                            : 'text-emerald-700 bg-emerald-100/60 border border-emerald-200/40'
                        }`}>
                          {trigger ? (isReject ? 'FAILED: Reject' : 'FAILED: Escalated') : 'PASSED'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-slate-600 pl-2.5 border-l-2 border-slate-200 leading-relaxed">
                        {trigger ? trigger.message : rule.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No prior FMG evaluation found for this claim.
        </div>
      )}

      {isReviewed ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Manual review completed</p>
              <StatusBadge variant={DECISION_VARIANTS[manualReview.manualDecision] || 'info'}>
                {humanize(manualReview.manualDecision)}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Reviewed by {manualReview.reviewedBy || 'FMG reviewer'} on {formatDateTime(manualReview.reviewedAt)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Reviewer Notes</p>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{manualReview.reviewerNotes}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="manual-review-notes" className="block text-sm font-semibold text-slate-700">
              Reviewer Notes <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Provide a clear justification for your decision. This will be recorded for audit purposes.
            </p>
            <textarea
              id="manual-review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter your review notes here..."
              rows={4}
              maxLength={2000}
              disabled={Boolean(actionLoading)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
            <div className="mt-1 flex justify-between">
              <p className={`text-xs ${notesCharCount > 1900 ? 'text-amber-600' : 'text-slate-400'}`}>
                {notesCharCount > 0 && !notes.trim() ? 'Notes cannot be blank.' : ''}
              </p>
              <p className={`text-xs ${notesCharCount > 1900 ? 'text-amber-600' : 'text-slate-400'}`}>
                {notesCharCount}/2000
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSubmit('APPROVED')}
              disabled={!isNotesValid || Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'APPROVED' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approve Manually
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('REJECTED')}
              disabled={!isNotesValid || Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'REJECTED' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject Manually
            </button>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
            <p>
              This is a manual override. Your decision and notes will be permanently recorded. This action cannot be
              undone.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default FmgManualReviewPanel;
