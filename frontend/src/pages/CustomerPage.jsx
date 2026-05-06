import PageShell from '../components/ui/PageShell.jsx';

function CustomerPage() {
  return (
    <PageShell title="Customer Dashboard" eyebrow="Customer">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-48 rounded-md bg-slate-100" />
      </section>
    </PageShell>
  );
}

export default CustomerPage;
