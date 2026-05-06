import DashboardCard from '../components/ui/DashboardCard.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';

function CustomerPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Customer Dashboard" eyebrow="Customer Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Welcome" title={user?.fullName}>
          <p className="text-sm text-slate-500">Manage your claims and policies.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Active Claims" title="0">
          <p className="text-sm text-slate-500">No active claims at this time.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Recent Activity" title="Account Created">
          <p className="text-sm text-slate-500">Your account is fully active.</p>
        </DashboardCard>
      </div>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-ink-900">My Claims</h3>
        <div className="mt-4 flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-500">You haven't submitted any claims yet.</p>
        </div>
      </section>
    </PageShell>
  );
}

export default CustomerPage;
