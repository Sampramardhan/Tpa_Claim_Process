import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import PolicyCard from '../components/ui/PolicyCard.jsx';
import { getPolicyCatalog, purchasePolicy, getMyPolicies } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CustomerCatalogPage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmPolicy, setConfirmPolicy] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catalogData, policiesData] = await Promise.all([
        getPolicyCatalog(),
        getMyPolicies()
      ]);
      setCatalog(catalogData || []);
      setMyPolicies(policiesData || []);
    } catch {
      setCatalog([]);
      setMyPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchase = async () => {
    if (!confirmPolicy) return;
    setError('');
    setPurchasing(true);
    try {
      const result = await purchasePolicy(confirmPolicy.id);
      setSuccessResult(result);
      setConfirmPolicy(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Purchase failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const ownedPolicyIds = new Set(myPolicies.filter((p) => p.active).map((p) => p.policyName));

  return (
    <PageShell title="Policy Catalog" eyebrow="Customer Portal">
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
          <div className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-900">Available Plans</h3>
            <p className="mt-1 text-sm text-slate-500">Browse and purchase coverage tailored to your needs.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : catalog.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
            <p className="text-sm text-slate-500">No policies available at this time.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {catalog.map((policy) => {
              const alreadyOwned = ownedPolicyIds.has(policy.policyName);
              return (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  actionLabel={alreadyOwned ? 'Already Owned' : 'Purchase Policy'}
                  disabled={alreadyOwned}
                  onAction={(p) => setConfirmPolicy(p)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Purchase Confirmation Modal */}
      <Modal open={!!confirmPolicy} onClose={() => { setConfirmPolicy(null); setError(''); }} title="Confirm Policy Purchase">
        {confirmPolicy && (
          <div className="space-y-4">
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <p><span className="font-medium text-slate-500">Policy:</span> {confirmPolicy.policyName}</p>
              <p><span className="font-medium text-slate-500">Carrier:</span> {confirmPolicy.carrierName}</p>
              <p><span className="font-medium text-slate-500">Type:</span> {TYPE_LABELS[confirmPolicy.policyType]}</p>
              <p><span className="font-medium text-slate-500">Coverage:</span> {formatCurrency(confirmPolicy.coverageAmount)}</p>
              <p><span className="font-medium text-slate-500">Premium:</span> {formatCurrency(confirmPolicy.premiumAmount)}</p>
              <p><span className="font-medium text-slate-500">Duration:</span> {confirmPolicy.policyDurationMonths} months</p>
            </div>
            <p className="text-xs text-slate-400">This is a simulated purchase. No actual payment will be processed.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setConfirmPolicy(null); setError(''); }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" disabled={purchasing} onClick={handlePurchase}
                className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">
                {purchasing ? 'Purchasing…' : 'Confirm Purchase'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Purchase Success Modal */}
      <Modal open={!!successResult} onClose={() => setSuccessResult(null)} title="Purchase Successful!">
        {successResult && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink-900">{successResult.policyName}</p>
              <p className="mt-1 text-sm text-slate-500">{successResult.carrierName}</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase text-emerald-600">Your Policy Number</p>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700">{successResult.uniquePolicyNumber}</p>
            </div>
            <div className="text-sm text-slate-500">
              <p>Coverage: {formatCurrency(successResult.coverageAmount)}</p>
              <p>Expires: {successResult.expiryDate}</p>
            </div>
            <button type="button" onClick={() => { setSuccessResult(null); navigate('/customer/policies'); }}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              View My Policies
            </button>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

export default CustomerCatalogPage;
