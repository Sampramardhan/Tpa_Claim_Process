const statusStyles = {
  SUBMITTED: 'bg-blue-50 text-blue-700 ring-blue-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
  MANUAL_REVIEW: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  PAYMENT_COMPLETED: 'bg-teal-50 text-teal-700 ring-teal-200',
  DEFAULT: 'bg-slate-50 text-slate-700 ring-slate-200',
};

function formatStatus(status) {
  return String(status || 'Pending').replaceAll('_', ' ');
}

function StatusBadge({ status, children }) {
  const style = statusStyles[status] || statusStyles.DEFAULT;

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ${style}`}>
      {children || formatStatus(status)}
    </span>
  );
}

export default StatusBadge;
