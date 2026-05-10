import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import DataTable from '../components/ui/DataTable.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getCarrierHistoryQueue } from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = { UNDER_REVIEW: 'info', PAID: 'active', REJECTED: 'expired' };
const STAGE_VARIANTS = { CARRIER_REVIEW: 'pending', COMPLETED: 'active' };

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function humanize(value) {
  return value?.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function CarrierHistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [historyQueue, setHistoryQueue] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');

  const loadHistoryQueue = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const data = await getCarrierHistoryQueue();
      setHistoryQueue(data || []);
    } catch {
      setHistoryQueue([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryQueue();
  }, [loadHistoryQueue]);

  const openClaimReview = (claimId) => {
    navigate('/carrier/claims/' + claimId);
  };

  const claimColumns = [
    { key: 'claimNumber', label: 'Claim No.', render: (c) => <span className="font-mono text-xs">{c.claimNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'policyNumber', label: 'Policy No.', render: (c) => <span className="font-mono text-xs">{c.customerPolicyNumber}</span> },
    {
      key: 'status', label: 'Status', render: (c) => (
        <div className="flex gap-2">
          <StatusBadge variant={CLAIM_STATUS_VARIANTS[c.status] || 'info'}>{humanize(c.status)}</StatusBadge>
          <StatusBadge variant={STAGE_VARIANTS[c.stage] || 'info'}>{humanize(c.stage)}</StatusBadge>
        </div>
      )
    },
    { key: 'submissionDate', label: 'Submitted', render: (c) => formatDateTime(c.submissionDate) },
  ];

  return (
    <PageShell title="Settlement History" eyebrow="Carrier Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/carrier')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">Settlement History</h3>
            <p className="mt-1 text-sm text-slate-500">History of claims processed for settlement (Paid or Rejected).</p>
          </div>
          <button
            type="button"
            onClick={loadHistoryQueue}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} /> Refresh History
          </button>
        </div>
        {loadingHistory ? (
          <div className="flex h-32 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <DataTable columns={claimColumns} data={historyQueue} onRowClick={(c) => openClaimReview(c.id)} emptyMessage="No processed historical claims found." />
        )}
      </section>

    </PageShell>
  );
}

export default CarrierHistoryPage;
