import DashboardCard from '../components/ui/DashboardCard.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';

function CarrierPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Carrier Dashboard" eyebrow="Insurance Provider Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Provider" title={user?.fullName}>
          <p className="text-sm text-slate-500">Carrier Operations Console</p>
        </DashboardCard>
        <DashboardCard eyebrow="Awaiting Payment" title="0 Claims">
          <p className="text-sm text-slate-500">No approved claims pending payment.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Total Disbursed" title="$0.00">
          <p className="text-sm text-slate-500">Current billing cycle.</p>
        </DashboardCard>
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-ink-900">Carrier Approval Queue</h3>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-500">No approvals required.</p>
        </div>
      </section>
    </PageShell>
  );
}

export default CarrierPage;
