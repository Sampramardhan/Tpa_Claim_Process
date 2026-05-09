import { useCallback, useEffect, useState, useMemo } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, FileSearch, Plus, Power, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import ReviewField from '../components/claims/ReviewField.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { POLICY_TYPES } from '../constants/appConstants.js';
import { createPolicy, getCarrierPolicies, togglePolicyActive } from '../services/api/policyApi.js';
import {
  getCarrierClaimsQueue,
  getCarrierHistoryQueue,
  getCarrierClaim,
  approveCarrierPayment,
  rejectCarrierClaim,
  getCarrierDocumentViewUrl
} from '../services/api/claimApi.js';

const INITIAL_FORM = {
  policyName: '',
  policyType: 'HEALTH',
  description: '',
  coverageAmount: '',
  premiumAmount: '',
  waitingPeriodDays: 0,
  policyDurationMonths: 12,
  carrierName: '',
  carrierCode: '',
};

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

const CLAIM_STATUS_VARIANTS = {
  UNDER_REVIEW: 'info',
  PAID: 'active',
  REJECTED: 'expired',
};

const STAGE_VARIANTS = {
  CARRIER_REVIEW: 'pending',
  COMPLETED: 'active',
};

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
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

function CarrierPage() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' or 'policies'
  
  // Policy State
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState(INITIAL_FORM);
  const [submittingPolicy, setSubmittingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [togglingPolicy, setTogglingPolicy] = useState(null);

  // Claims State
  const [claimQueue, setClaimQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [claimDetails, setClaimDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(null); // 'approve' or 'reject'

  const loadPolicies = useCallback(async () => {
    try {
      setLoadingPolicies(true);
      const data = await getCarrierPolicies();
      setPolicies(data || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoadingPolicies(false);
    }
  }, []);

  const loadClaimsQueue = useCallback(async () => {
    try {
      setLoadingClaims(true);
      const data = await getCarrierClaimsQueue();
      setClaimQueue(data || []);
    } catch {
      setClaimQueue([]);
    } finally {
      setLoadingClaims(false);
    }
  }, []);

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
    loadPolicies();
    loadClaimsQueue();
    loadHistoryQueue();
  }, [loadPolicies, loadClaimsQueue, loadHistoryQueue]);

  // Policy Handlers
  const handlePolicyChange = (e) => {
    const { name, value } = e.target;
    setPolicyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePolicySubmit = async (e) => {
    e.preventDefault();
    setPolicyError('');
    setSubmittingPolicy(true);
    try {
      const payload = {
        ...policyForm,
        coverageAmount: Number(policyForm.coverageAmount),
        premiumAmount: Number(policyForm.premiumAmount),
        waitingPeriodDays: Number(policyForm.waitingPeriodDays),
        policyDurationMonths: Number(policyForm.policyDurationMonths),
      };
      await createPolicy(payload);
      setShowCreatePolicy(false);
      setPolicyForm(INITIAL_FORM);
      await loadPolicies();
    } catch (err) {
      setPolicyError(err.response?.data?.message || 'Failed to create policy.');
    } finally {
      setSubmittingPolicy(false);
    }
  };

  const handlePolicyToggle = async (policy) => {
    setTogglingPolicy(policy.id);
    try {
      await togglePolicyActive(policy.id);
      await loadPolicies();
    } catch { /* silent */ } finally {
      setTogglingPolicy(null);
    }
  };

  // Claim Handlers
  const openClaimReview = async (claimId) => {
    setSelectedClaimId(claimId);
    setClaimDetails(null);
    setReviewerNotes('');
    setError('');
    setSuccess('');
    setLoadingDetails(true);
    try {
      const data = await getCarrierClaim(claimId);
      setClaimDetails(data);
      if (data?.documents?.length > 0) {
        setSelectedDocumentId(data.documents[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load claim details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAction = async (type) => {
    setActionLoading(type);
    setError('');
    setSuccess('');
    try {
      if (type === 'approve') {
        await approveCarrierPayment(selectedClaimId, { reviewerNotes });
        setSuccess('Payment approved successfully.');
      } else {
        if (!reviewerNotes.trim()) {
          throw new Error('Rejection notes are required.');
        }
        await rejectCarrierClaim(selectedClaimId, { reviewerNotes });
        setSuccess('Claim rejected successfully.');
      }
      await loadClaimsQueue();
      setShowConfirm(null);
      // Keep modal open to show success state, then user can close
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  const policyColumns = [
    { key: 'policyName', label: 'Policy Name' },
    { key: 'policyType', label: 'Type', render: (r) => TYPE_LABELS[r.policyType] || r.policyType },
    { key: 'carrierName', label: 'Carrier' },
    { key: 'coverageAmount', label: 'Coverage', render: (r) => formatCurrency(r.coverageAmount) },
    { key: 'premiumAmount', label: 'Premium', render: (r) => formatCurrency(r.premiumAmount) },
    {
      key: 'policyDurationMonths', label: 'Duration',
      render: (r) => r.policyDurationMonths >= 12
        ? `${Math.floor(r.policyDurationMonths / 12)}Y`
        : `${r.policyDurationMonths}M`,
    },
    {
      key: 'active', label: 'Status',
      render: (r) => <StatusBadge variant={r.active ? 'active' : 'expired'}>{r.active ? 'Active' : 'Inactive'}</StatusBadge>,
    },
    { key: 'enrolledCount', label: 'Enrolled', render: (r) => r.enrolledCount || 0 },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <button
          type="button"
          disabled={togglingPolicy === r.id}
          onClick={(e) => { e.stopPropagation(); handlePolicyToggle(r); }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            r.active
              ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          } disabled:opacity-50`}
        >
          <Power className="h-3 w-3" />
          {r.active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  const claimColumns = [
    { key: 'claimNumber', label: 'Claim No.', render: (c) => <span className="font-mono text-xs">{c.claimNumber}</span> },
    { key: 'customerName', label: 'Customer' },
    { key: 'policyNumber', label: 'Policy No.', render: (c) => <span className="font-mono text-xs">{c.customerPolicyNumber}</span> },
    {
      key: 'status', label: 'Status',
      render: (c) => (
        <div className="flex gap-2">
          <StatusBadge variant={CLAIM_STATUS_VARIANTS[c.status] || 'info'}>{humanize(c.status)}</StatusBadge>
          <StatusBadge variant={STAGE_VARIANTS[c.stage] || 'info'}>{humanize(c.stage)}</StatusBadge>
        </div>
      )
    },
    { key: 'submissionDate', label: 'Submitted', render: (c) => formatDateTime(c.submissionDate) },
  ];

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
        <DashboardCard eyebrow="Provider" title={user?.fullName}>
          <p className="text-sm text-slate-500">Carrier Settlement Authority</p>
        </DashboardCard>
        <DashboardCard eyebrow="Pending Review" title={String(claimQueue.length)}>
          <p className="text-sm text-slate-500">Claims awaiting final settlement</p>
        </DashboardCard>
        <DashboardCard eyebrow="Total Policies" title={String(policies.length)}>
          <p className="text-sm text-slate-500">{policies.filter(p => p.active).length} active products</p>
        </DashboardCard>
        <DashboardCard eyebrow="Processed" title={String(historyQueue.length)}>
          <p className="text-sm text-slate-500">Total historical claims</p>
        </DashboardCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

      <div className="mt-8 border-b border-slate-200">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab('claims')}
            className={`border-b-2 py-4 text-sm font-semibold transition ${
              activeTab === 'claims' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Claims Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`border-b-2 py-4 text-sm font-semibold transition ${
              activeTab === 'history' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Settlement History
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`border-b-2 py-4 text-sm font-semibold transition ${
              activeTab === 'policies' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Policy Management
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'policies' ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink-900">Policy Management</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadPolicies}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPolicies ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatePolicy(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Plus className="h-4 w-4" /> Create Policy
                </button>
              </div>
            </div>
            {loadingPolicies ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataTable columns={policyColumns} data={policies} emptyMessage="No policies created yet." />
            )}
          </section>
        ) : activeTab === 'history' ? (
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
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataTable
                columns={claimColumns}
                data={historyQueue}
                onRowClick={(c) => openClaimReview(c.id)}
                emptyMessage="No processed historical claims found."
              />
            )}
          </section>
        ) : (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">Claims Review Queue</h3>
                <p className="mt-1 text-sm text-slate-500">Final settlement authority for forwarded FMG claims.</p>
              </div>
              <button
                type="button"
                onClick={loadClaimsQueue}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadingClaims ? 'animate-spin' : ''}`} /> Refresh Queue
              </button>
            </div>
            {loadingClaims ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataTable
                columns={claimColumns}
                data={claimQueue}
                onRowClick={(c) => openClaimReview(c.id)}
                emptyMessage="No claims pending carrier review."
              />
            )}
          </section>
        )}
      </div>

      {/* Policy Modal */}
      <Modal open={showCreatePolicy} onClose={() => { setShowCreatePolicy(false); setPolicyError(''); }} title="Create New Policy" wide>
        <form onSubmit={handlePolicySubmit} className="space-y-4">
          {policyError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{policyError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Name *</label>
              <input name="carrierName" value={policyForm.carrierName} onChange={handlePolicyChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Code *</label>
              <input name="carrierCode" value={policyForm.carrierCode} onChange={handlePolicyChange} required maxLength={10}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Name *</label>
              <input name="policyName" value={policyForm.policyName} onChange={handlePolicyChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Type *</label>
              <select name="policyType" value={policyForm.policyType} onChange={handlePolicyChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {Object.entries(POLICY_TYPES).map(([key, val]) => (
                  <option key={key} value={val}>{TYPE_LABELS[val] || val}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Description</label>
            <textarea name="description" value={policyForm.description} onChange={handlePolicyChange} rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Brief description of the policy..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Coverage Amount (₹) *</label>
              <input name="coverageAmount" type="number" min="1" value={policyForm.coverageAmount} onChange={handlePolicyChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="500000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Premium Amount (₹) *</label>
              <input name="premiumAmount" type="number" min="1" value={policyForm.premiumAmount} onChange={handlePolicyChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="12000" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Duration (Months) *</label>
              <input name="policyDurationMonths" type="number" min="1" value={policyForm.policyDurationMonths} onChange={handlePolicyChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Waiting Period (Days)</label>
              <input name="waitingPeriodDays" type="number" min="0" value={policyForm.waitingPeriodDays} onChange={handlePolicyChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setShowCreatePolicy(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
            <button type="submit" disabled={submittingPolicy} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white">Create Policy</button>
          </div>
        </form>
      </Modal>

      {/* Claim Review Modal */}
      <Modal open={!!selectedClaimId} onClose={() => setSelectedClaimId(null)} title={claimDetails?.claim?.claimNumber ? `Carrier Review • ${claimDetails.claim.claimNumber}` : 'Carrier Claim Review'} wide>
        {loadingDetails ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : claimDetails ? (
          <div className="flex h-full flex-col bg-slate-50">
            <div className="flex flex-1 gap-6 overflow-hidden p-6">
              {/* Document Panel */}
              <section className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:w-[60%]">
                <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Preview</span>
                  {claimDetails.documents?.length > 0 && (
                    <div className="flex gap-1">
                      {claimDetails.documents.map(doc => (
                        <button key={doc.id} onClick={() => setSelectedDocumentId(doc.id)} 
                          className={`px-2 py-1 text-[10px] font-bold rounded ${selectedDocumentId === doc.id ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {humanize(doc.documentType)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-slate-800">
                  {selectedDocumentId ? (
                    <DocumentViewer url={getCarrierDocumentViewUrl(selectedClaimId, selectedDocumentId, token)} title="Document Preview" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">Select a document</div>
                  )}
                </div>
              </section>

              {/* Data Panel */}
              <section className="flex flex-col space-y-6 overflow-y-auto lg:w-[40%] pr-2">
                {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2"><XCircle className="h-4 w-4" /> {error}</div>}
                {success && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</div>}

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-4">Claim Context</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReviewField label="Customer" value={claimDetails.claim.customerName} />
                    <ReviewField label="Policy No." value={claimDetails.claim.customerPolicyNumber} mono />
                    <ReviewField label="Policy Name" value={claimDetails.claim.policyName} />
                    <ReviewField label="Submitted" value={formatDateTime(claimDetails.claim.submissionDate)} />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-4">OCR Extracted Data</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReviewField label="Hospital" value={claimDetails.extractedData?.hospitalName} />
                    <ReviewField label="Diagnosis" value={claimDetails.extractedData?.diagnosis} multiline />
                    <ReviewField label="Admission" value={claimDetails.extractedData?.admissionDate} />
                    <ReviewField label="Discharge" value={claimDetails.extractedData?.dischargeDate} />
                    <ReviewField label="Claimed Amount" value={formatCurrency(claimDetails.extractedData?.claimedAmount)} />
                    <ReviewField label="Total Bill" value={formatCurrency(claimDetails.extractedData?.totalBillAmount)} />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-4">FMG Decision</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Recommended:</span>
                      <StatusBadge variant={claimDetails.fmgDecision?.recommendedDecision === 'APPROVED' ? 'active' : 'expired'}>
                        {humanize(claimDetails.fmgDecision?.recommendedDecision)}
                      </StatusBadge>
                    </div>
                    {claimDetails.manualReview && (
                      <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700 border border-indigo-100">
                        <p className="font-bold">FMG Manual Override</p>
                        <p className="mt-1 italic">"{claimDetails.manualReview.reviewerNotes}"</p>
                      </div>
                    )}
                  </div>
                </section>

                <TimelineShell entries={claimDetails.timeline || []} />

                {/* Carrier Terminal Actions */}
                {!success && claimDetails.claim.stage === 'CARRIER_REVIEW' && (
                  <section className="sticky bottom-0 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Carrier Settlement Action</h4>
                    <textarea 
                      value={reviewerNotes} 
                      onChange={(e) => setReviewerNotes(e.target.value)} 
                      placeholder="Enter settlement notes..."
                      className="w-full rounded-md border border-slate-300 p-3 text-sm mb-4 focus:ring-brand-500 focus:border-brand-500"
                      rows={2}
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setShowConfirm('reject')} className="flex-1 rounded-md border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100">Reject Claim</button>
                      <button onClick={() => setShowConfirm('approve')} className="flex-1 rounded-md bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Approve Payment</button>
                    </div>
                  </section>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Confirmation Modal */}
      <Modal open={!!showConfirm} onClose={() => setShowConfirm(null)} title="Confirm Settlement Decision">
        <div className="p-4">
          <div className={`flex items-center gap-3 rounded-lg p-4 ${showConfirm === 'approve' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {showConfirm === 'approve' ? <ShieldCheck className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            <div>
              <p className="font-bold">Confirm {showConfirm === 'approve' ? 'Payment Approval' : 'Rejection'}</p>
              <p className="text-sm opacity-90">This is a terminal action and will complete the claim lifecycle.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setShowConfirm(null)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
            <button 
              onClick={() => handleAction(showConfirm)}
              disabled={!!actionLoading}
              className={`rounded-md px-6 py-2 text-sm font-bold text-white shadow-sm ${showConfirm === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
            >
              {actionLoading ? 'Processing...' : `Yes, Confirm ${showConfirm === 'approve' ? 'Payment' : 'Rejection'}`}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

export default CarrierPage;

