import PageShell from '../components/ui/PageShell.jsx';

const moduleSummaries = [
  'Customer',
  'Client',
  'FMG',
  'Carrier',
];

function DashboardPage() {
  return (
    <PageShell title="Dashboard" eyebrow="Workspace">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {moduleSummaries.map((moduleName) => (
          <article key={moduleName} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Module</p>
            <h3 className="mt-2 text-lg font-semibold text-ink-900">{moduleName}</h3>
            <div className="mt-5 h-2 rounded-full bg-slate-100" />
          </article>
        ))}
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-ink-900">Dashboard Shell</h3>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="h-28 rounded-md bg-slate-100" />
          <div className="h-28 rounded-md bg-slate-100" />
          <div className="h-28 rounded-md bg-slate-100" />
        </div>
      </section>
    </PageShell>
  );
}

export default DashboardPage;
