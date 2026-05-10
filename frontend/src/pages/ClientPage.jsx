import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  FileSearch,
  ShieldCheck,
  Users,
  FileStack,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getClientClaimsQueue,
  getClientHistoryQueue,
} from '../services/api/claimApi.js';
import { getAllCustomerPolicies } from '../services/api/policyApi.js';

function ClientPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [claimQueue, setClaimQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesData, queueData, historyData] = await Promise.all([
        getAllCustomerPolicies(),
        getClientClaimsQueue(),
        getClientHistoryQueue()
      ]);
      setRecords(policiesData || []);
      setClaimQueue(queueData || []);
      setHistoryQueue(historyData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRecords = records.length;
  const uniqueCustomers = new Set(records.map((record) => record.customerId)).size;
  const readyForReview = claimQueue.length;
  
  const totalClaims = claimQueue.length + historyQueue.length;
  const rejectedClaims = historyQueue.filter(c => c.status === 'REJECTED' || c.stage === 'CLIENT_REJECTED').length;
  const approvedClaims = historyQueue.length - rejectedClaims;

  const claimHistoryData = useMemo(() => [
    { name: 'Approved / Forwarded', value: approvedClaims, fill: '#10b981' },
    { name: 'Rejected', value: rejectedClaims, fill: '#f43f5e' }
  ], [approvedClaims, rejectedClaims]);

  return (
    <PageShell title="Client Dashboard" eyebrow="Client Portal">
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customers</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{uniqueCustomers}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Policies</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{totalRecords}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Claims</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{totalClaims}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Processed (Approved)</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{approvedClaims}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Processed (Rejected)</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{rejectedClaims}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {/* Navigation Cards */}
          <button 
            onClick={() => navigate('/client/queue')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 group-hover:bg-brand-100">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-600">Client Review Queue</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review OCR outputs, run deterministic validation, and reject/forward claims.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600">
              <span>{readyForReview} Pending</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/client/policies')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-sky-50 p-3 text-sky-600 group-hover:bg-sky-100">
              <FileStack className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-sky-600">Customer Policy Records</h3>
            <p className="mt-2 text-sm text-slate-500">
              Browse all registered customer policies, check active/expired statuses.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-600">
              <span>View Directory</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/client/verify')}
            className="group sm:col-span-2 flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-amber-50 p-3 text-amber-600 group-hover:bg-amber-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-amber-600">Quick Policy Verification</h3>
            <p className="mt-2 text-sm text-slate-500">
              Search by policy number to instantly verify coverage validity and details.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-600">
              <span>Verify Now</span> &rarr;
            </div>
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Claim History (Processed)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={claimHistoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {claimHistoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-slate-500">
            Out of {historyQueue.length} claims processed
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default ClientPage;
