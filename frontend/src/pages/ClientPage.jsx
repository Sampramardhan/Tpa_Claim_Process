import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getClientClaim,
  getClientClaimsQueue,
  getClientHistoryQueue,
  getClientDocumentViewUrl,
} from '../services/api/claimApi.js';
import { getAllCustomerPolicies, searchPolicies, verifyPolicy } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };
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

function extractErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  return error?.response?.data?.message || fallback;
}



function ClientPage() {
  const { user, token } = useAuth();
  const [records, setRecords] = useState([]);
  const [claimQueue, setClaimQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimQueueLoading, setClaimQueueLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState(null);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

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

  const applyClaimDetails = useCallback((data) => {
    setActiveClaimDetails(data);
    setSelectedDocumentId((current) => {
      if (!data?.documents?.length) {
        return null;
      }
      return current && data.documents.some((doc) => doc.id === current) ? current : data.documents[0].id;
    });
  }, []);

  const loadClientClaimDetails = useCallback(async (claimId) => {
    setReviewLoading(true);
    setReviewError('');
    try {
      const data = await getClientClaim(claimId);
      applyClaimDetails(data);
      return data;
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to load claim review details.'));
      throw error;
    } finally {
      setReviewLoading(false);
    }
  }, [applyClaimDetails]);



  useEffect(() => {
    loadAllPolicies();
    loadClaimQueue();
    loadHistoryQueue();
  }, [loadAllPolicies, loadClaimQueue, loadHistoryQueue]);

  const handleSearch = async (event) => {
    event.preventDefault();
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

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!verifyInput.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const result = await verifyPolicy(verifyInput.trim());
      setVerifyResult(result);
    } catch (error) {
      setVerifyError(error.response?.data?.message || 'Policy not found.');
    } finally {
      setVerifying(false);
    }
  };

  const openClaimReview = async (claimId) => {
    setActiveClaimId(claimId);
    setReviewSuccess('');
    setReviewError('');
    setIsReviewOpen(true);

    try {
      await loadClientClaimDetails(claimId);
    } catch {
      // Error state is already handled in load/validate helpers.
    }
  };

  const closeClaimReview = () => {
    setIsReviewOpen(false);
    setActiveClaimId(null);
    setActiveClaimDetails(null);
    setSelectedDocumentId(null);
    setReviewError('');
    setReviewSuccess('');
  };



  const totalRecords = records.length;
  const activeRecords = records.filter((record) => record.active).length;
  const uniqueCustomers = new Set(records.map((record) => record.customerId)).size;
  const readyForReview = claimQueue.length;

  const activeClaim = activeClaimDetails?.claim;
  const activeValidation = activeClaimDetails?.validation;
  const selectedDocumentUrl = selectedDocumentId
    ? getClientDocumentViewUrl(activeClaimId, selectedDocumentId, token)
    : null;

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

  // Analytics Data
  const policyStatusData = useMemo(() => [
    { name: 'Active', value: activeRecords, fill: '#10b981' },
    { name: 'Expired', value: totalRecords - activeRecords, fill: '#f43f5e' }
  ], [activeRecords, totalRecords]);

  const queueOverviewData = useMemo(() => [
    { name: 'Pending Review', count: claimQueue.length, fill: '#f59e0b' },
    { name: 'Processed History', count: historyQueue.length, fill: '#3b82f6' }
  ], [claimQueue, historyQueue]);

  return (
    <PageShell title="Client Dashboard" eyebrow="Client Portal">
      <div className="grid gap-6 lg:grid-cols-4">
        <DashboardCard eyebrow="Signed In As" title={user?.fullName}>
          <p className="text-sm text-slate-500">Bank / Mediator Operations</p>
        </DashboardCard>
        <DashboardCard eyebrow="Review Queue" title={String(readyForReview)}>
          <p className="text-sm text-slate-500">Pending client validations waiting for a decision</p>
        </DashboardCard>
        <DashboardCard eyebrow="Policy Records" title={String(totalRecords)}>
          <p className="text-sm text-slate-500">{activeRecords} active, {totalRecords - activeRecords} expired</p>
        </DashboardCard>
        <DashboardCard eyebrow="Unique Customers" title={String(uniqueCustomers)}>
          <p className="text-sm text-slate-500">With policy ownership</p>
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Policy Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={policyStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                  {policyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-ink-900 mb-4">Validation Queue Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueOverviewData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
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

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-ink-900">Quick Policy Verification</h3>
        <form onSubmit={handleVerify} className="flex gap-3">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={verifyInput}
              onChange={(event) => setVerifyInput(event.target.value)}
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
                onChange={(event) => setSearchQuery(event.target.value)}
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

      <Modal open={isReviewOpen} onClose={closeClaimReview} title={activeClaim?.claimNumber ? `Client Review • ${activeClaim.claimNumber}` : 'Client Claim Review'} wide>
        {reviewLoading ? (
          <div className="flex h-full items-center justify-center bg-slate-50">
            <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        ) : activeClaimDetails ? (
          <div className="flex h-full flex-col bg-slate-100/50">
            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{activeClaim.customerName}</p>
                  <p className="mt-1 text-sm text-slate-500">{activeClaim.policyName} • {activeClaim.carrierName}</p>
                  <p className="mt-2 text-xs text-slate-400">Submitted {formatDateTime(activeClaim.submissionDate)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant={CLAIM_STATUS_VARIANTS[activeClaim.status] || 'info'}>{humanize(activeClaim.status)}</StatusBadge>
                  <StatusBadge variant={STAGE_VARIANTS[activeClaim.stage] || 'info'}>{humanize(activeClaim.stage)}</StatusBadge>
                  <StatusBadge variant={OCR_STATUS_VARIANTS[activeClaim.ocrStatus] || 'info'}>{humanize(activeClaim.ocrStatus || 'PENDING')}</StatusBadge>
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[1.05fr,0.95fr]">
              <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Uploaded Documents</h4>
                      <p className="text-sm font-bold text-slate-800">Preview Source Files</p>
                    </div>
                    {activeClaimDetails.documents?.length ? (
                      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                        {activeClaimDetails.documents.map((document) => (
                          <button
                            key={document.id}
                            type="button"
                            onClick={() => setSelectedDocumentId(document.id)}
                            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                              selectedDocumentId === document.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {humanize(document.documentType)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="relative min-h-0 flex-1 bg-slate-800">
                  {selectedDocumentUrl ? (
                    <DocumentViewer url={selectedDocumentUrl} title="Client Claim Document Preview" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
                      <FileSearch className="h-12 w-12 opacity-30" />
                      <p className="mt-3 text-sm">Select a document to preview</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="min-h-0 space-y-6 overflow-y-auto pr-1">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Validation Result</h4>
                      <p className="text-sm font-bold text-slate-800">Deterministic Client Checks</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {activeValidation ? (
                        <>
                          <StatusBadge variant={VALIDATION_STATUS_VARIANTS[activeValidation.validationStatus] || 'info'}>
                            {humanize(activeValidation.validationStatus)}
                          </StatusBadge>
                          <StatusBadge variant={REVIEW_DECISION_VARIANTS[activeValidation.reviewDecision] || 'info'}>
                            {humanize(activeValidation.reviewDecision)}
                          </StatusBadge>
                        </>
                      ) : null}

                    </div>
                  </div>

                  {reviewError ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {reviewError}
                    </div>
                  ) : null}

                  {reviewSuccess ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {reviewSuccess}
                    </div>
                  ) : null}

                  {activeValidation?.validatedAt ? (
                    <p className="mt-4 text-xs text-slate-500">
                      Last validated by <span className="font-medium text-slate-700">{activeValidation.validatedBy}</span> on {formatDateTime(activeValidation.validatedAt)}
                    </p>
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    {(activeValidation?.checks || []).map((check) => (
                      <div
                        key={check.code}
                        className={`rounded-xl border px-4 py-3 ${
                          check.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {check.passed ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 flex-none text-red-600" />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink-900">{check.label}</p>
                              <StatusBadge variant={check.passed ? 'active' : 'expired'}>
                                {check.passed ? 'Pass' : 'Fail'}
                              </StatusBadge>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{check.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!activeValidation?.checks?.length ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        Run validation to view the client review checklist.
                      </div>
                    ) : null}
                  </div>

                  {activeValidation?.rejectionReason ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <p className="font-semibold text-red-800">Stored rejection reason</p>
                      <p className="mt-1">{activeValidation.rejectionReason}</p>
                    </div>
                  ) : null}


                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">OCR Extracted Data</h4>
                    <p className="text-sm font-bold text-slate-800">Structured Claim Summary</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ReviewField label="Policy Number" value={activeClaimDetails.extractedData?.policyNumber} />
                    <ReviewField label="Policy Name" value={activeClaimDetails.extractedData?.policyName} />
                    <ReviewField label="Customer Name" value={activeClaimDetails.extractedData?.customerName} />
                    <ReviewField label="Patient Name" value={activeClaimDetails.extractedData?.patientName} />
                    <ReviewField label="Carrier Name" value={activeClaimDetails.extractedData?.carrierName} />
                    <ReviewField label="Hospital Name" value={activeClaimDetails.extractedData?.hospitalName} />
                    <ReviewField label="Admission Date" value={activeClaimDetails.extractedData?.admissionDate} />
                    <ReviewField label="Discharge Date" value={activeClaimDetails.extractedData?.dischargeDate} />
                    <ReviewField label="Claim Type" value={activeClaimDetails.extractedData?.claimType} />
                    <ReviewField label="Bill Number" value={activeClaimDetails.extractedData?.billNumber} />
                    <ReviewField label="Claimed Amount" value={activeClaimDetails.extractedData?.claimedAmount} />
                    <ReviewField label="Total Bill" value={activeClaimDetails.extractedData?.totalBillAmount} />
                  </div>
                  <div className="mt-3">
                    <ReviewField label="Diagnosis" value={activeClaimDetails.extractedData?.diagnosis} multiline />
                  </div>
                </section>

                <TimelineShell entries={activeClaimDetails.timeline || []} />
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeClaimReview}
                  className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}

function ReviewField({ label, value, multiline = false }) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${multiline ? 'sm:col-span-2' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-medium text-ink-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {hasValue ? String(value) : 'Not available'}
      </p>
    </div>
  );
}

export default ClientPage;
