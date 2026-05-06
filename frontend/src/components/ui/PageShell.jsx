function PageShell({ title, eyebrow, children }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-600">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default PageShell;
