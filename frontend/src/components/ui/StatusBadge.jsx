const VARIANTS = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  info: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400',
};

function StatusBadge({ variant = 'info', children }) {
  const classes = VARIANTS[variant] || VARIANTS.info;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
