import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, FileSearch, ClipboardEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getFmgManualReviewQueue,
  getFmgClaim
} from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = { DRAFT: 'info', SUBMITTED: 'pending', UNDER_REVIEW: 'info', APPROVED: 'active', REJECTED: 'expired', MANUAL_REVIEW: 'pending', PAID: 'active' };
const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };
const STAGE_VARIANTS = { FMG_REVIEW: 'pending', FMG_MANUAL_REVIEW: 'pending', CARRIER_REVIEW: 'active', COMPLETED: 'expired' };
const DECISION_VARIANTS = { APPROVED: 'active', REJECTED: 'expired', MANUAL_REVIEW: 'pending' };

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Not available';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
}

function humanize(value) {
  return value?.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function extractErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  return error?.response?.data?.message || fallback;
}



function FmgManualQueuePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [manualQueue, setManualQueue] = useState([]);
  const [queueDecisionState, setQueueDecisionState] = useState({});
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');

  const loadQueues = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');
    try {
      const queue = await getFmgManualReviewQueue();
      setManualQueue(queue || []);
      await hydrateQueueDecisions(queue || []);
    } catch (error) {
      setManualQueue([]);
      setQueueDecisionState({});
      setQueueError(extractErrorMessage(error, 'Unable to load the FMG manual review queue.'));
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  async function hydrateQueueDecisions(queue) {
    if (!queue.length) {
      setQueueDecisionState({});
      return;
    }
    setQueueDecisionState(Object.fromEntries(queue.map((claim) => [claim.id, { loading: true, decision: null }])));
    const results = await Promise.allSettled(queue.map((claim) => getFmgClaim(claim.id)));
    const nextState = {};
    results.forEach((result, index) => {
      const claimId = queue[index].id;
      nextState[claimId] = {
        loading: false,
        decision: result.status === 'fulfilled' ? result.value?.fmgDecision || null : null,
      };
    });
    setQueueDecisionState(nextState);
  }

  function openClaimReview(claimId) {
    navigate('/fmg/claims/' + claimId);
  }

  const columns = [
    { key: 'claimNumber', label: 'Claim No.', render: (claim) => <span className="font-mono text-xs">{claim.claimNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerPolicyNumber', label: 'Policy No.', render: (claim) => <span className="font-mono text-xs">{claim.customerPolicyNumber}</span> },
    {
      key: 'status', label: 'Current Status', render: (claim) => (
        <div className="flex items-center gap-2">
          <StatusBadge variant={CLAIM_STATUS_VARIANTS[claim.status] || 'info'}>{humanize(claim.status)}</StatusBadge>
          <StatusBadge variant={STAGE_VARIANTS[claim.stage] || 'info'}>{humanize(claim.stage)}</StatusBadge>
        </div>
      )
    },
    {
      key: 'evaluation', label: 'Evaluation Result', render: (claim) => {
        const decisionState = queueDecisionState[claim.id];
        if (!decisionState || decisionState.loading) {
          return <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking</span>;
        }
        if (!decisionState.decision?.recommendedDecision) return <StatusBadge variant="info">Not Evaluated</StatusBadge>;
        return (
          <div className="flex items-center gap-2">
            <StatusBadge variant={DECISION_VARIANTS[decisionState.decision.recommendedDecision] || 'info'}>{humanize(decisionState.decision.recommendedDecision)}</StatusBadge>
            {decisionState.decision.confirmed ? <StatusBadge variant="active">Confirmed</StatusBadge> : null}
          </div>
        );
      }
    },
    { key: 'submissionDate', label: 'Submitted', render: (claim) => formatDateTime(claim.submissionDate) },
  ];

  return (
    <PageShell title="Manual Review Queue" eyebrow="FMG Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/fmg')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">Manual Review Queue</h3>
            <p className="mt-1 text-sm text-slate-500">
              Claims requiring manual inspection by FMG analysts.
            </p>
          </div>
          <button
            type="button"
            onClick={loadQueues}
            disabled={queueLoading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {queueLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Queue
          </button>
        </div>

        {queueError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{queueError}</div>
        ) : null}

        {queueLoading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={manualQueue}
            emptyMessage="No claims pending manual evaluation."
            onRowClick={(claim) => openClaimReview(claim.id)}
          />
        )}
      </section>
    </PageShell>
  );
}

export default FmgManualQueuePage;
