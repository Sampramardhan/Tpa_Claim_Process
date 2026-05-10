import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Power, RefreshCw } from 'lucide-react';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { POLICY_TYPES } from '../constants/appConstants.js';
import { createPolicy, getCarrierPolicies, togglePolicyActive } from '../services/api/policyApi.js';

const INITIAL_FORM = {
  policyName: '', policyType: 'HEALTH', description: '', coverageAmount: '',
  premiumAmount: '', waitingPeriodDays: 0, policyDurationMonths: 12,
  carrierName: '', carrierCode: '',
};

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CarrierPoliciesPage() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState(INITIAL_FORM);
  const [submittingPolicy, setSubmittingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [togglingPolicy, setTogglingPolicy] = useState(null);

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

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

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

  const policyColumns = [
    { key: 'policyName', label: 'Policy Name' },
    { key: 'policyType', label: 'Type', render: (r) => TYPE_LABELS[r.policyType] || r.policyType },
    { key: 'carrierName', label: 'Carrier' },
    { key: 'coverageAmount', label: 'Coverage', render: (r) => formatCurrency(r.coverageAmount) },
    { key: 'premiumAmount', label: 'Premium', render: (r) => formatCurrency(r.premiumAmount) },
    { key: 'policyDurationMonths', label: 'Duration', render: (r) => r.policyDurationMonths >= 12 ? `${Math.floor(r.policyDurationMonths / 12)}Y` : `${r.policyDurationMonths}M` },
    { key: 'active', label: 'Status', render: (r) => <StatusBadge variant={r.active ? 'active' : 'expired'}>{r.active ? 'Active' : 'Inactive'}</StatusBadge> },
    { key: 'enrolledCount', label: 'Enrolled', render: (r) => r.enrolledCount || 0 },
    {
      key: 'actions', label: 'Actions', render: (r) => (
        <button type="button" disabled={togglingPolicy === r.id} onClick={(e) => { e.stopPropagation(); handlePolicyToggle(r); }}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${r.active ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} disabled:opacity-50`}>
          <Power className="h-3 w-3" />
          {r.active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <PageShell title="Policy Management" eyebrow="Carrier Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/carrier')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink-900">Policy Management</h3>
          <div className="flex gap-2">
            <button type="button" onClick={loadPolicies} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <RefreshCw className={`h-4 w-4 ${loadingPolicies ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" onClick={() => setShowCreatePolicy(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
              <Plus className="h-4 w-4" /> Create Policy
            </button>
          </div>
        </div>
        {loadingPolicies ? (
          <div className="flex h-32 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : (
          <DataTable columns={policyColumns} data={policies} emptyMessage="No policies created yet." />
        )}
      </section>

      {/* Policy Modal */}
      <Modal open={showCreatePolicy} onClose={() => { setShowCreatePolicy(false); setPolicyError(''); }} title="Create New Policy" wide>
        <form onSubmit={handlePolicySubmit} className="space-y-4">
          {policyError && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{policyError}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Name *</label>
              <input name="carrierName" value={policyForm.carrierName} onChange={handlePolicyChange} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Code *</label>
              <input name="carrierCode" value={policyForm.carrierCode} onChange={handlePolicyChange} required maxLength={10} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Name *</label>
              <input name="policyName" value={policyForm.policyName} onChange={handlePolicyChange} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Type *</label>
              <select name="policyType" value={policyForm.policyType} onChange={handlePolicyChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {Object.entries(POLICY_TYPES).map(([key, val]) => (<option key={key} value={val}>{TYPE_LABELS[val] || val}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Description</label>
            <textarea name="description" value={policyForm.description} onChange={handlePolicyChange} rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="Brief description of the policy..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Coverage Amount (₹) *</label>
              <input name="coverageAmount" type="number" min="1" value={policyForm.coverageAmount} onChange={handlePolicyChange} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="500000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Premium Amount (₹) *</label>
              <input name="premiumAmount" type="number" min="1" value={policyForm.premiumAmount} onChange={handlePolicyChange} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="12000" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Duration (Months) *</label>
              <input name="policyDurationMonths" type="number" min="1" value={policyForm.policyDurationMonths} onChange={handlePolicyChange} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Waiting Period (Days)</label>
              <input name="waitingPeriodDays" type="number" min="0" value={policyForm.waitingPeriodDays} onChange={handlePolicyChange} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setShowCreatePolicy(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
            <button type="submit" disabled={submittingPolicy} className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white">Create Policy</button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}

export default CarrierPoliciesPage;
