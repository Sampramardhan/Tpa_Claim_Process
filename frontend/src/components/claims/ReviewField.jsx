function ReviewField({ label, value, multiline = false, mono = false }) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${multiline ? 'sm:col-span-2' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-2 text-sm font-medium text-ink-900 ${multiline ? 'whitespace-pre-wrap' : ''} ${
          mono ? 'font-mono text-xs sm:text-sm' : ''
        }`}
      >
        {hasValue ? String(value) : 'Not available'}
      </p>
    </div>
  );
}

export default ReviewField;
