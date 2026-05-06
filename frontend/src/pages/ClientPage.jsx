import PageShell from '../components/ui/PageShell.jsx';

function ClientPage() {
  return (
    <PageShell title="Client Dashboard" eyebrow="Client">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-48 rounded-md bg-slate-100" />
      </section>
    </PageShell>
  );
}

export default ClientPage;
