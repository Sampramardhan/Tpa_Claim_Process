function DashboardCard({ eyebrow, title, children }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      {eyebrow ? <p className="text-sm font-medium text-slate-500">{eyebrow}</p> : null}
      <h3 className="mt-2 text-lg font-semibold text-ink-900">{title}</h3>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export default DashboardCard;
