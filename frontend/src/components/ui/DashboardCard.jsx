function DashboardCard({ eyebrow, title, children }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-200 group">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 opacity-50 pointer-events-none" />
      <div className="relative z-10">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 group-hover:text-brand-500 transition-colors">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-2xl font-black tracking-tight text-ink-900 drop-shadow-sm">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </article>
  );
}

export default DashboardCard;
