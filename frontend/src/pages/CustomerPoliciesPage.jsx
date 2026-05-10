import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { getMyPolicies } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CustomerPoliciesPage() {
  const navigate = useNavigate();
  const [myPolicies, setMyPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailPolicy, setDetailPolicy] = useState(null);

  const loadMyPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyPolicies();
      setMyPolicies(data || []);
    } catch {
      setMyPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyPolicies();
  }, [loadMyPolicies]);

  return (
    <PageShell title="My Policies" eyebrow="Customer Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/customer')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-sky-50 p-3 text-sky-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-900">Your Active & Expired Policies</h3>
            <p className="mt-1 text-sm text-slate-500">View details, coverage limits, and status of your purchased plans.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : myPolicies.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
            <p className="text-sm text-slate-500">You haven't purchased any policies yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {myPolicies.map((cp) => (
              <div
                key={cp.id}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
                onClick={() => setDetailPolicy(cp)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{cp.carrierName}</p>
                    <h4 className="mt-1 text-base font-bold text-ink-900">{cp.policyName}</h4>
                    <p className="mt-1 font-mono text-xs text-slate-500">{cp.uniquePolicyNumber}</p>
                  </div>
                  <StatusBadge variant={cp.active ? 'active' : 'expired'}>
                    {cp.active ? 'Active' : 'Expired'}
                  </StatusBadge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Coverage</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(cp.coverageAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Premium</p>
                    <p className="font-semibold text-ink-900">{formatCurrency(cp.premiumAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Purchased</p>
                    <p className="font-medium text-slate-700">{cp.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Expires</p>
                    <p className="font-medium text-slate-700">{cp.expiryDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Policy Detail Modal */}
      <Modal open={!!detailPolicy} onClose={() => setDetailPolicy(null)} title="Policy Details">
        {detailPolicy && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Policy Number</span><span className="font-mono font-semibold text-ink-900">{detailPolicy.uniquePolicyNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Policy Name</span><span className="font-medium">{detailPolicy.policyName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Carrier</span><span className="font-medium">{detailPolicy.carrierName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium">{TYPE_LABELS[detailPolicy.policyType]}</span></div>
              <hr className="border-slate-200" />
              <div className="flex justify-between"><span className="text-slate-500">Coverage</span><span className="font-semibold text-ink-900">{formatCurrency(detailPolicy.coverageAmount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Premium</span><span className="font-semibold text-ink-900">{formatCurrency(detailPolicy.premiumAmount)}</span></div>
              <hr className="border-slate-200" />
              <div className="flex justify-between"><span className="text-slate-500">Purchased</span><span>{detailPolicy.purchaseDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Expires</span><span>{detailPolicy.expiryDate}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge variant={detailPolicy.active ? 'active' : 'expired'}>{detailPolicy.active ? 'Active' : 'Expired'}</StatusBadge></div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

export default CustomerPoliciesPage;
