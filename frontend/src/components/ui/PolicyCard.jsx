import { Shield } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

const TYPE_COLORS = {
  HEALTH: 'from-emerald-500 to-teal-600',
  LIFE: 'from-blue-500 to-indigo-600',
  AD_AND_D: 'from-amber-500 to-orange-600',
  CRITICAL_ILLNESS: 'from-rose-500 to-pink-600',
};

const TYPE_LABELS = {
  HEALTH: 'Health',
  LIFE: 'Life',
  AD_AND_D: 'AD&D',
  CRITICAL_ILLNESS: 'Critical Illness',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function PolicyCard({ policy, actionLabel, onAction, disabled = false }) {
  const gradient = TYPE_COLORS[policy.policyType] || TYPE_COLORS.HEALTH;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`bg-gradient-to-r ${gradient} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
            {TYPE_LABELS[policy.policyType] || policy.policyType}
          </span>
          <Shield className="h-5 w-5 text-white/60" />
        </div>
        <h4 className="mt-2 text-base font-semibold text-white">{policy.policyName}</h4>
        <p className="mt-0.5 text-xs text-white/80">{policy.carrierName}</p>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {policy.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-500">{policy.description}</p>
        )}

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Coverage</span>
            <span className="font-semibold text-ink-900">{formatCurrency(policy.coverageAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Premium</span>
            <span className="font-semibold text-ink-900">{formatCurrency(policy.premiumAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Duration</span>
            <span className="font-medium text-ink-700">
              {policy.policyDurationMonths >= 12
                ? `${Math.floor(policy.policyDurationMonths / 12)} Year${Math.floor(policy.policyDurationMonths / 12) > 1 ? 's' : ''}`
                : `${policy.policyDurationMonths} Month${policy.policyDurationMonths > 1 ? 's' : ''}`}
            </span>
          </div>
          {policy.waitingPeriodDays > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Waiting Period</span>
              <span className="font-medium text-ink-700">{policy.waitingPeriodDays} Days</span>
            </div>
          )}
        </div>

        {policy.enrolledCount !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <StatusBadge variant="info">{policy.enrolledCount} Enrolled</StatusBadge>
          </div>
        )}

        {actionLabel && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction?.(policy)}
            className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}

export default PolicyCard;
