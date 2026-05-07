import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, ShieldCheck } from 'lucide-react';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getClientClaimsQueue } from '../services/api/claimApi.js';
import { getAllCustomerPolicies, searchPolicies, verifyPolicy } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };
const CLAIM_STATUS_VARIANTS = { DRAFT: 'info', SUBMITTED: 'pending', UNDER_REVIEW: 'pending', APPROVED: 'active', REJECTED: 'expired' };
const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

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

function ClientPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [claimQueue, setClaimQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimQueueLoading, setClaimQueueLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadAllPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllCustomerPolicies();
      setRecords(data || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    loadAllPolicies();
    loadClaimQueue();
  }, [loadAllPolicies, loadClaimQueue]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadAllPolicies();
      return;
    }

    setSearching(true);
    try {
      const data = await searchPolicies(searchQuery.trim());
      setRecords(data || []);
    } catch {
      setRecords([]);
    } finally {
      setSearching(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const result = await verifyPolicy(verifyInput.trim());
      setVerifyResult(result);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Policy not found.');
    } finally {
      setVerifying(false);
    }
  };

  const totalRecords = records.length;
  const activeRecords = records.filter((record) => record.active).length;
  const uniqueCustomers = new Set(records.map((record) => record.customerId)).size;
  const readyForReview = claimQueue.length;

  const columns = [
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'policyName', label: 'Policy' },
    { key: 'policyType', label: 'Type', render: (record) => TYPE_LABELS[record.policyType] || record.policyType },
    { key: 'uniquePolicyNumber', label: 'Policy No.', render: (record) => <span className="font-mono text-xs">{record.uniquePolicyNumber}</span> },
    { key: 'carrierName', label: 'Carrier' },
    { key: 'coverageAmount', label: 'Coverage', render: (record) => formatCurrency(record.coverageAmount) },
    { key: 'purchaseDate', label: 'Purchased' },
    { key: 'expiryDate', label: 'Expires' },
    {
      key: 'active',
      label: 'Status',
      render: (record) => <StatusBadge variant={record.active ? 'active' : 'expired'}>{record.active ? 'Active' : 'Expired'}</StatusBadge>,
    },
  ];

  const claimColumns = [
    { key: 'claimNumber', label: 'Claim No.', render: (claim) => <span className="font-mono text-xs">{claim.claimNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'policyName', label: 'Policy' },
    { key: 'carrierName', label: 'Carrier' },
    { key: 'customerPolicyNumber', label: 'Policy No.', render: (claim) => <span className="font-mono text-xs">{claim.customerPolicyNumber}</span> },
    { key: 'submissionDate', label: 'Submitted', render: (claim) => formatDateTime(claim.submissionDate) },
    {
      key: 'ocrStatus',
      label: 'OCR',
      render: (claim) => <StatusBadge variant={OCR_STATUS_VARIANTS[claim.ocrStatus] || 'info'}>{humanize(claim.ocrStatus || 'PENDING')}</StatusBadge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (claim) => <StatusBadge variant={CLAIM_STATUS_VARIANTS[claim.status] || 'info'}>{humanize(claim.status)}</StatusBadge>,
    },
  ];

  return (
    <PageShell title="Client Dashboard" eyebrow="Client Portal">
      <div className="grid gap-4 lg:grid-cols-4">
        <DashboardCard eyebrow="Signed In As" title={user?.fullName}>
          <p className="text-sm text-slate-500">Bank / Mediator Operations</p>
        </DashboardCard>
        <DashboardCard eyebrow="Review Queue" title={String(readyForReview)}>
          <p className="text-sm text-slate-500">Customer-submitted claims awaiting review</p>
        </DashboardCard>
        <DashboardCard eyebrow="Policy Records" title={String(totalRecords)}>
          <p className="text-sm text-slate-500">{activeRecords} active, {totalRecords - activeRecords} expired</p>
        </DashboardCard>
        <DashboardCard eyebrow="Unique Customers" title={String(uniqueCustomers)}>
          <p className="text-sm text-slate-500">With policy ownership</p>
        </DashboardCard>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">Client Review Queue</h3>
            <p className="mt-1 text-sm text-slate-500">
              Claims appear here only after the customer performs the final submission step.
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

        {claimQueueLoading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataTable
            columns={claimColumns}
            data={claimQueue}
            emptyMessage="No customer-submitted claims are waiting for client review."
          />
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-ink-900">Quick Policy Verification</h3>
        <form onSubmit={handleVerify} className="flex gap-3">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Enter policy number (e.g., STAR-HLTH-2026-0001)"
              className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-4 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || !verifyInput.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {verifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify
          </button>
        </form>

        {verifyError && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{verifyError}</div>
        )}

        {verifyResult && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Policy Verified</span>
              <StatusBadge variant={verifyResult.active ? 'active' : 'expired'}>
                {verifyResult.active ? 'Active' : 'Expired'}
              </StatusBadge>
            </div>
            <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500">Customer:</span> <span className="font-medium">{verifyResult.customerName}</span></p>
              <p><span className="text-slate-500">Email:</span> <span className="font-medium">{verifyResult.customerEmail}</span></p>
              <p><span className="text-slate-500">Policy:</span> <span className="font-medium">{verifyResult.policyName}</span></p>
              <p><span className="text-slate-500">Carrier:</span> <span className="font-medium">{verifyResult.carrierName}</span></p>
              <p><span className="text-slate-500">Coverage:</span> <span className="font-semibold">{formatCurrency(verifyResult.coverageAmount)}</span></p>
              <p><span className="text-slate-500">Policy No:</span> <span className="font-mono font-semibold">{verifyResult.uniquePolicyNumber}</span></p>
              <p><span className="text-slate-500">Purchased:</span> {verifyResult.purchaseDate}</p>
              <p><span className="text-slate-500">Expires:</span> {verifyResult.expiryDate}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">Customer Policy Records</h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer or policy no."
                className="w-64 rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadAllPolicies();
                }}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={records}
            emptyMessage="No customer policy records found."
            onRowClick={(row) => setDetail(row)}
          />
        )}
      </section>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Policy Ownership Details">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-semibold">{detail.customerName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{detail.customerEmail}</span></div>
            <hr className="border-slate-200" />
            <div className="flex justify-between"><span className="text-slate-500">Policy No.</span><span className="font-mono font-semibold">{detail.uniquePolicyNumber}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Policy</span><span className="font-medium">{detail.policyName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Type</span><span>{TYPE_LABELS[detail.policyType]}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Carrier</span><span>{detail.carrierName}</span></div>
            <hr className="border-slate-200" />
            <div className="flex justify-between"><span className="text-slate-500">Coverage</span><span className="font-semibold">{formatCurrency(detail.coverageAmount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Purchased</span><span>{detail.purchaseDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Expires</span><span>{detail.expiryDate}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge variant={detail.active ? 'active' : 'expired'}>{detail.active ? 'Active' : 'Expired'}</StatusBadge></div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

export default ClientPage;
