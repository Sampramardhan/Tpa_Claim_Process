import TimelineShell from '../components/timeline/TimelineShell.jsx';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageShell title="Dashboard" eyebrow="Workspace">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Signed In" title={user?.fullName || 'User'}>
          <p className="text-sm font-medium uppercase text-slate-500">{user?.role}</p>
        </DashboardCard>
        <DashboardCard eyebrow="Session" title="Authenticated">
          <div className="h-2 rounded-full bg-emerald-100" />
        </DashboardCard>
        <DashboardCard eyebrow="Access Scope" title={`${user?.role || 'Role'} Portal`}>
          <div className="h-2 rounded-full bg-slate-100" />
        </DashboardCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink-900">Dashboard Shell</h3>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="h-28 rounded-md bg-slate-100" />
            <div className="h-28 rounded-md bg-slate-100" />
            <div className="h-28 rounded-md bg-slate-100" />
          </div>
        </section>

        <TimelineShell entries={[]} />
      </div>
    </PageShell>
  );
}

export default DashboardPage;
