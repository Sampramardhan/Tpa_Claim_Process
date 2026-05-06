import DashboardCard from '../components/ui/DashboardCard.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';

function FmgPage() {
  const { user } = useAuth();

  return (
    <PageShell title="FMG Dashboard" eyebrow="TPA Processor Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Processor" title={user?.fullName}>
          <p className="text-sm text-slate-500">TPA Administrative Console</p>
        </DashboardCard>
        <DashboardCard eyebrow="Manual Review Required" title="0 Claims">
          <p className="text-sm text-slate-500">Rule engine queue is clear.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Auto-Adjudicated" title="0 Claims">
          <p className="text-sm text-slate-500">Stats reset daily.</p>
        </DashboardCard>
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-ink-900">FMG Operations Queue</h3>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-500">No operations pending.</p>
        </div>
      </section>
    </PageShell>
  );
}

export default FmgPage;
