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

function FmgManualReviewPanel({ manualReview, fmgDecision, actionLoading = '', onSubmit }) {
  const [notes, setNotes] = useState('');
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
