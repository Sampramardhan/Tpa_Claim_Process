import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getClientClaimsQueue,
  getClientHistoryQueue,
} from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = {
  DRAFT: 'info',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'info',
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'info',
  PAID: 'active',
};
const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };
const STAGE_VARIANTS = {
  CLIENT_REVIEW: 'pending',
  CUSTOMER_SUBMITTED: 'pending',
  CLIENT_REJECTED: 'expired',
  FMG_REVIEW: 'active',
  DRAFT: 'info',
};
const VALIDATION_STATUS_VARIANTS = { PENDING: 'pending', PASSED: 'active', FAILED: 'expired' };
const REVIEW_DECISION_VARIANTS = { PENDING: 'info', FORWARDED_TO_FMG: 'active', REJECTED: 'expired' };

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function humanize(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  return error?.response?.data?.message || fallback;
}

function ClientQueuePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [claimQueue, setClaimQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [claimQueueLoading, setClaimQueueLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const loadClaimQueue = useCallback(async () => {
    try {
      setClaimQueueLoading(true);
      const data = await getClientClaimsQueue();
      setClaimQueue(data || []);
    } catch {
      setClaimQueue([]);
    } finally {
      setClaimQueueLoading(false);
    }
  }, []);

  const loadHistoryQueue = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await getClientHistoryQueue();
      setHistoryQueue(data || []);
    } catch {
      setHistoryQueue([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaimQueue();
    loadHistoryQueue();
  }, [loadClaimQueue, loadHistoryQueue]);

  const openClaimReview = (claimId) => {
    navigate('/client/claims/' + claimId);
  };

  const claimColumns = [
    { key: 'claimNumber', label: 'Claim No.', render: (claim) => <span className="font-mono text-xs">{claim.claimNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'policyName', label: 'Policy' },
    { key: 'customerPolicyNumber', label: 'Policy No.', render: (claim) => <span className="font-mono text-xs">{claim.customerPolicyNumber}</span> },
    { key: 'carrierName', label: 'Carrier' },
    { key: 'submissionDate', label: 'Submitted', render: (claim) => formatDateTime(claim.submissionDate) },
    {
      key: 'ocrStatus',
      label: 'OCR',
      render: (claim) => <StatusBadge variant={OCR_STATUS_VARIANTS[claim.ocrStatus] || 'info'}>{humanize(claim.ocrStatus || 'PENDING')}</StatusBadge>,
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (claim) => <StatusBadge variant={STAGE_VARIANTS[claim.stage] || 'info'}>{humanize(claim.stage)}</StatusBadge>,
    },
  ];

  return (
    <PageShell title="Review Queue" eyebrow="Client Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/client')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">Client Review Queue</h3>
            <p className="mt-1 text-sm text-slate-500">
              Open a claim to inspect uploaded documents, review OCR output, run deterministic validation, and either reject it or forward it to FMG.
            </p>
          </div>
          <button
            type="button"
            onClick={loadClaimQueue}
            disabled={claimQueueLoading}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {claimQueueLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh Queue
          </button>
        </div>

        <div className="mt-6 mb-4 flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'pending'
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'history'
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Processed History
          </button>
        </div>

        {(activeTab === 'pending' ? claimQueueLoading : historyLoading) ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataTable
            columns={claimColumns}
            data={activeTab === 'pending' ? claimQueue : historyQueue}
            emptyMessage={activeTab === 'pending' ? "No customer-submitted claims are waiting for client review." : "No processed historical claims found."}
            onRowClick={(claim) => openClaimReview(claim.id)}
          />
        )}
      </section>

    </PageShell>
  );
}

export default ClientQueuePage;
