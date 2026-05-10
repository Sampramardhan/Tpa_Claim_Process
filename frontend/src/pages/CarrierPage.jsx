import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, FileSearch, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getCarrierPolicies } from '../services/api/policyApi.js';
import {
  getCarrierClaimsQueue,
  getCarrierHistoryQueue,
} from '../services/api/claimApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function CarrierPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [policies, setPolicies] = useState([]);
  const [claimQueue, setClaimQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [policiesData, claimsData, historyData] = await Promise.all([
        getCarrierPolicies(),
        getCarrierClaimsQueue(),
        getCarrierHistoryQueue()
      ]);
      setPolicies(policiesData || []);
      setClaimQueue(claimsData || []);
      setHistoryQueue(historyData || []);
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Analytics Data Preparation
  const policyChartData = useMemo(() => {
    const counts = policies.reduce((acc, p) => {
      acc[p.policyType] = (acc[p.policyType] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value }));
  }, [policies]);
  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b'];

  const claimStatusData = useMemo(() => {
    const pending = claimQueue.length;
    const approved = historyQueue.filter(c => c.status === 'PAID').length;
    const rejected = historyQueue.filter(c => c.status === 'REJECTED').length;
    return [
      { name: 'Pending', count: pending, fill: '#f59e0b' },
      { name: 'Paid', count: approved, fill: '#10b981' },
      { name: 'Rejected', count: rejected, fill: '#ef4444' }
    ];
  }, [claimQueue, historyQueue]);

  return (
    <PageShell title="Carrier Dashboard" eyebrow="Insurance Provider Portal">
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Provider</p>
          <p className="mt-2 text-xl font-bold text-ink-900 truncate">{user?.fullName}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{claimQueue.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Policies</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{policies.filter(p => p.active).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Processed</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{historyQueue.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {/* Navigation Cards */}
          <button 
            onClick={() => navigate('/carrier/queue')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 group-hover:bg-brand-100">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-600">Claims Review Queue</h3>
            <p className="mt-2 text-sm text-slate-500">
              Final settlement authority for forwarded FMG claims. Process approvals and rejections.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600">
              <span>{claimQueue.length} Pending</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/carrier/policies')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-sky-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-sky-50 p-3 text-sky-600 group-hover:bg-sky-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-sky-600">Policy Management</h3>
            <p className="mt-2 text-sm text-slate-500">
              Create, configure, and manage active insurance products and plans.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-600">
              <span>Manage {policies.length} Policies</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/carrier/history')}
            className="group sm:col-span-2 flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600 group-hover:bg-emerald-100">
              <FileSearch className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-emerald-600">Settlement History</h3>
            <p className="mt-2 text-sm text-slate-500">
              Historical view of all claims that have been completely processed for settlement (Paid or Rejected).
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <span>View History ({historyQueue.length})</span> &rarr;
            </div>
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Policy Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={policyChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {policyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Settlement Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={claimStatusData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default CarrierPage;

