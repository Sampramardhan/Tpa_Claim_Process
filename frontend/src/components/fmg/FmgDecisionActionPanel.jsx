import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react';
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

function FmgDecisionActionPanel({ decision, actionLoading = '', onConfirm }) {
  const recommendedDecision = decision?.recommendedDecision;
  const isConfirmed = Boolean(decision?.confirmed);
  const isEvaluated = Boolean(recommendedDecision);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Decision Confirmation</h4>
        <p className="text-sm font-bold text-slate-800">Finalize FMG Outcome</p>
      </div>

      {!isEvaluated ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Run the FMG evaluation before confirming a final decision.
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink-900">Recommended outcome</p>
              <StatusBadge variant={DECISION_VARIANTS[recommendedDecision] || 'info'}>
                {humanize(recommendedDecision)}
              </StatusBadge>
              {isConfirmed ? (
                <StatusBadge variant="active">Confirmed</StatusBadge>
              ) : (
                <StatusBadge variant="pending">Awaiting confirmation</StatusBadge>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              The backend confirms only the latest rule recommendation. After confirmation, the claim stage will update immediately.
            </p>
            {isConfirmed ? (
              <p className="mt-2 text-xs text-slate-500">
                Confirmed by {decision.confirmedBy || 'FMG reviewer'} on {formatDateTime(decision.confirmedAt)}
              </p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DecisionButton
              label="Approve"
              icon={CheckCircle2}
              active={recommendedDecision === 'APPROVED'}
              variant="approve"
              loading={actionLoading === 'APPROVED'}
              disabled={!isEvaluated || isConfirmed || recommendedDecision !== 'APPROVED'}
              onClick={() => onConfirm('APPROVED')}
            />
            <DecisionButton
              label="Reject"
              icon={XCircle}
              active={recommendedDecision === 'REJECTED'}
              variant="reject"
              loading={actionLoading === 'REJECTED'}
              disabled={!isEvaluated || isConfirmed || recommendedDecision !== 'REJECTED'}
              onClick={() => onConfirm('REJECTED')}
            />
            <DecisionButton
              label="Manual Review"
              icon={AlertTriangle}
              active={recommendedDecision === 'MANUAL_REVIEW'}
              variant="manual"
              loading={actionLoading === 'MANUAL_REVIEW'}
              disabled={!isEvaluated || isConfirmed || recommendedDecision !== 'MANUAL_REVIEW'}
              onClick={() => onConfirm('MANUAL_REVIEW')}
            />
          </div>

          {!isConfirmed ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Clock3 className="mt-0.5 h-4 w-4 flex-none" />
              <p>Only the action that matches the current rule-engine recommendation can be confirmed.</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function DecisionButton({ label, icon: Icon, active, variant, loading, disabled, onClick }) {
  const classes = {
    approve: active
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      : 'border-slate-200 bg-white text-slate-500',
    reject: active
      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
      : 'border-slate-200 bg-white text-slate-500',
    manual: active
      ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
      : 'border-slate-200 bg-white text-slate-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes[variant]}`}
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

export default FmgDecisionActionPanel;
