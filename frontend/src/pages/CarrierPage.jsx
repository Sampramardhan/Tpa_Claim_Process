import { useCallback, useEffect, useState } from 'react';
import { Plus, Power, RefreshCw } from 'lucide-react';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { POLICY_TYPES } from '../constants/appConstants.js';
import { createPolicy, getCarrierPolicies, togglePolicyActive } from '../services/api/policyApi.js';

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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CarrierPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCarrierPolicies();
      setPolicies(data || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        coverageAmount: Number(form.coverageAmount),
        premiumAmount: Number(form.premiumAmount),
        waitingPeriodDays: Number(form.waitingPeriodDays),
        policyDurationMonths: Number(form.policyDurationMonths),
      };
      await createPolicy(payload);
      setShowCreate(false);
      setForm(INITIAL_FORM);
      await loadPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create policy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (policy) => {
    setToggling(policy.id);
    try {
      await togglePolicyActive(policy.id);
      await loadPolicies();
    } catch { /* silent */ } finally {
      setToggling(null);
    }
  };

  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => p.active).length;
  const totalEnrolled = policies.reduce((sum, p) => sum + (p.enrolledCount || 0), 0);

  const columns = [
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
      render: (r) => <StatusBadge variant={r.active ? 'active' : 'inactive'}>{r.active ? 'Active' : 'Inactive'}</StatusBadge>,
    },
    { key: 'enrolledCount', label: 'Enrolled', render: (r) => r.enrolledCount || 0 },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <button
          type="button"
          disabled={toggling === r.id}
          onClick={(e) => { e.stopPropagation(); handleToggle(r); }}
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

  return (
    <PageShell title="Carrier Dashboard" eyebrow="Insurance Provider Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Provider" title={user?.fullName}>
          <p className="text-sm text-slate-500">Carrier Operations Console</p>
        </DashboardCard>
        <DashboardCard eyebrow="Total Policies" title={String(totalPolicies)}>
          <p className="text-sm text-slate-500">{activePolicies} active · {totalPolicies - activePolicies} inactive</p>
        </DashboardCard>
        <DashboardCard eyebrow="Total Enrollments" title={String(totalEnrolled)}>
          <p className="text-sm text-slate-500">Customers across all policies</p>
        </DashboardCard>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-900">Policy Management</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadPolicies}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" /> Create Policy
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataTable columns={columns} data={policies} emptyMessage="No policies created yet." />
        )}
      </section>

      {/* Create Policy Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setError(''); }} title="Create New Policy" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Name *</label>
              <input name="carrierName" value={form.carrierName} onChange={handleChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Star Health Insurance" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Carrier Code *</label>
              <input name="carrierCode" value={form.carrierCode} onChange={handleChange} required maxLength={10}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="STAR" />
              <p className="mt-1 text-xs text-slate-400">2-10 chars, used in policy numbers</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Name *</label>
              <input name="policyName" value={form.policyName} onChange={handleChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Comprehensive Health Cover" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Policy Type *</label>
              <select name="policyType" value={form.policyType} onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                {Object.entries(POLICY_TYPES).map(([key, val]) => (
                  <option key={key} value={val}>{TYPE_LABELS[val] || val}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Brief description of the policy..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Coverage Amount (₹) *</label>
              <input name="coverageAmount" type="number" min="1" value={form.coverageAmount} onChange={handleChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="500000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Premium Amount (₹) *</label>
              <input name="premiumAmount" type="number" min="1" value={form.premiumAmount} onChange={handleChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="12000" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Duration (Months) *</label>
              <input name="policyDurationMonths" type="number" min="1" value={form.policyDurationMonths} onChange={handleChange} required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Waiting Period (Days)</label>
              <input name="waitingPeriodDays" type="number" min="0" value={form.waitingPeriodDays} onChange={handleChange}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => { setShowCreate(false); setError(''); }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Policy'}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}

export default CarrierPage;
