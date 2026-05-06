function LoadingSpinner({ label = 'Loading', inverse = false }) {
  const textColor = inverse ? 'text-white' : 'text-slate-600';
  const borderColor = inverse ? 'border-white/40 border-t-white' : 'border-slate-300 border-t-brand-600';

  return (
    <div className={`inline-flex items-center gap-2 text-sm font-medium ${textColor}`} role="status">
      <span className={`h-4 w-4 animate-spin rounded-full border-2 ${borderColor}`} />
      <span>{label}</span>
    </div>
  );
}

export default LoadingSpinner;
