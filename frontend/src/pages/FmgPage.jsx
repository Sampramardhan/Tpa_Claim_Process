import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardEdit, FileSearch, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getFmgClaim,
  getFmgClaimsQueue,
  getFmgHistoryQueue,
  getFmgManualReviewQueue,
} from '../services/api/claimApi.js';

function FmgPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claimQueue, setClaimQueue] = useState([]);
  const [manualQueue, setManualQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [queueDecisionState, setQueueDecisionState] = useState({});

  useEffect(() => {
    loadQueues();
  }, []);

  async function loadQueues() {
    try {
      const [queue, manual, history] = await Promise.all([
        getFmgClaimsQueue(),
        getFmgManualReviewQueue(),
        getFmgHistoryQueue()
      ]);
      setClaimQueue(queue || []);
      setManualQueue(manual || []);
      setHistoryQueue(history || []);
      await hydrateQueueDecisions([...(queue || []), ...(manual || [])]);
    } catch (error) {
      console.error(error);
    }
  }

  async function hydrateQueueDecisions(queue) {
    if (!queue.length) {
      setQueueDecisionState({});
      return;
    }
    const results = await Promise.allSettled(queue.map((claim) => getFmgClaim(claim.id)));
    const nextState = {};
    results.forEach((result, index) => {
      const claimId = queue[index].id;
      nextState[claimId] = {
        decision: result.status === 'fulfilled' ? result.value?.fmgDecision || null : null,
      };
    });
    setQueueDecisionState(nextState);
  }

  const evaluatedCount = claimQueue.filter((claim) => queueDecisionState[claim.id]?.decision?.recommendedDecision).length;
  const awaitingConfirmationCount = claimQueue.filter(
    (claim) =>
      queueDecisionState[claim.id]?.decision?.recommendedDecision &&
      !queueDecisionState[claim.id]?.decision?.confirmed
  ).length;

  // Analytics Data
  const workloadData = useMemo(() => [
    { name: 'Standard', count: claimQueue.length, fill: '#0ea5e9' },
    { name: 'Manual', count: manualQueue.length, fill: '#8b5cf6' },
    { name: 'Processed', count: historyQueue.length, fill: '#10b981' }
  ], [claimQueue, manualQueue, historyQueue]);

  const evaluationData = useMemo(() => {
    const unconfirmed = awaitingConfirmationCount;
    const confirmed = evaluatedCount - awaitingConfirmationCount;
    const pendingEval = claimQueue.length - evaluatedCount;
    return [
      { name: 'Evaluated & Confirmed', value: confirmed },
      { name: 'Evaluated (Unconfirmed)', value: unconfirmed },
      { name: 'Pending Evaluation', value: pendingEval }
    ].filter(d => d.value > 0);
  }, [claimQueue, evaluatedCount, awaitingConfirmationCount]);
  
  const EVAL_COLORS = ['#10b981', '#f59e0b', '#cbd5e1'];

  return (
    <PageShell title="FMG Dashboard" eyebrow="FMG Review Portal">
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Welcome</p>
          <p className="mt-2 text-xl font-bold text-ink-900 truncate">{user?.fullName}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Standard Queue</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{claimQueue.length}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Manual Queue</p>
          <p className="mt-2 text-3xl font-bold text-indigo-700">{manualQueue.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evaluated</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{evaluatedCount}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {/* Navigation Cards */}
          <button 
            onClick={() => navigate('/fmg/queue')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 group-hover:bg-brand-100">
              <FileSearch className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-600">Standard Queue</h3>
            <p className="mt-2 text-sm text-slate-500">
              Review standard claims, evaluate rules, and confirm final FMG decisions.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600">
              <span>{claimQueue.length} Pending</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/fmg/manual')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600 group-hover:bg-indigo-100">
              <ClipboardEdit className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-indigo-600">Manual Review</h3>
            <p className="mt-2 text-sm text-slate-500">
              High-priority claims flagged for expert manual intervention.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <span>{manualQueue.length} Flagged</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/fmg/history')}
            className="group sm:col-span-2 flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600 group-hover:bg-emerald-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-emerald-600">Processed History</h3>
            <p className="mt-2 text-sm text-slate-500">
              Historical view of all claims that have been successfully processed by FMG.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <span>View History ({historyQueue.length})</span> &rarr;
            </div>
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Standard Queue Status</h3>
            <div className="h-64">
              {evaluationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={evaluationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {evaluationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={EVAL_COLORS[index % EVAL_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">No data available</div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Workload Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={workloadData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="count">
                    {workloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default FmgPage;
