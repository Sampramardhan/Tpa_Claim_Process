function DashboardCard({ eyebrow, title, children }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500 group">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 opacity-50 pointer-events-none" />
      <div className="relative z-10">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-2xl font-black tracking-tight text-ink-900 dark:text-slate-100 drop-shadow-sm">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </article>
  );
}

export default DashboardCard;
