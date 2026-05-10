import ThemeToggle from './ThemeToggle.jsx';

function PageShell({ title, eyebrow, children }) {
  return (
    <section className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink-900 dark:text-white">{title}</h2>
        </div>
        <ThemeToggle />
      </div>
      {children}
    </section>
  );
}

export default PageShell;
