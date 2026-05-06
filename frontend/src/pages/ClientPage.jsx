import DashboardCard from '../components/ui/DashboardCard.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';

function ClientPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Client Dashboard" eyebrow="Client Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Signed In As" title={user?.fullName}>
          <p className="text-sm text-slate-500">Bank / Mediator Operations</p>
        </DashboardCard>
        <DashboardCard eyebrow="Pending Review" title="0 Claims">
          <p className="text-sm text-slate-500">No claims require your attention.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Processed Today" title="0 Claims">
          <p className="text-sm text-slate-500">Awaiting new submissions.</p>
        </DashboardCard>
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-ink-900">Client Claim Queue</h3>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-500">No claims in queue.</p>
        </div>
      </section>
    </PageShell>
  );
}

export default ClientPage;
