import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getFmgHistoryQueue,
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



function FmgEvaluatedHistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [historyQueue, setHistoryQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');

  const loadQueues = useCallback(async () => {
    setQueueLoading(true);
    setQueueError('');
    try {
      const history = await getFmgHistoryQueue();
      setHistoryQueue(history || []);
    } catch (error) {
      setHistoryQueue([]);
      setQueueError(extractErrorMessage(error, 'Unable to load the FMG history queue.'));
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

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
    { key: 'submissionDate', label: 'Submitted', render: (claim) => formatDateTime(claim.submissionDate) },
  ];

  return (
    <PageShell title="Processed History" eyebrow="FMG Portal">
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
            <h3 className="text-lg font-semibold text-ink-900">FMG Processed History</h3>
            <p className="mt-1 text-sm text-slate-500">
              Historical view of claims that have been processed by FMG.
            </p>
          </div>
          <button
            type="button"
            onClick={loadQueues}
            disabled={queueLoading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {queueLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh History
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
            data={historyQueue}
            emptyMessage="No processed historical claims found."
            onRowClick={(claim) => openClaimReview(claim.id)}
          />
        )}
      </section>
    </PageShell>
  );
}

export default FmgEvaluatedHistoryPage;
