import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShoppingBag, RefreshCw } from 'lucide-react';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import PolicyCard from '../components/ui/PolicyCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getPolicyCatalog, purchasePolicy, getMyPolicies } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CustomerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('catalog');
  const [catalog, setCatalog] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmPolicy, setConfirmPolicy] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [error, setError] = useState('');
  const [detailPolicy, setDetailPolicy] = useState(null);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await getPolicyCatalog();
      setCatalog(data || []);
    } catch { setCatalog([]); }
  }, []);

  const loadMyPolicies = useCallback(async () => {
    try {
      const data = await getMyPolicies();
      setMyPolicies(data || []);
    } catch { setMyPolicies([]); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCatalog(), loadMyPolicies()]).finally(() => setLoading(false));
  }, [loadCatalog, loadMyPolicies]);

  const handlePurchase = async () => {
    if (!confirmPolicy) return;
    setError('');
    setPurchasing(true);
    try {
      const result = await purchasePolicy(confirmPolicy.id);
      setSuccessResult(result);
      setConfirmPolicy(null);
      await loadMyPolicies();
      await loadCatalog();
    } catch (err) {
      setError(err.response?.data?.message || 'Purchase failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const ownedPolicyIds = new Set(myPolicies.filter((p) => p.active).map((p) => p.policyName));

  return (
    <PageShell title="Customer Dashboard" eyebrow="Customer Portal">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Welcome" title={user?.fullName}>
          <p className="text-sm text-slate-500">Manage your policies and coverage.</p>
        </DashboardCard>
        <DashboardCard eyebrow="My Policies" title={String(myPolicies.length)}>
          <p className="text-sm text-slate-500">{myPolicies.filter((p) => p.active).length} active</p>
        </DashboardCard>
        <DashboardCard eyebrow="Available Plans" title={String(catalog.length)}>
          <p className="text-sm text-slate-500">Browse and purchase coverage.</p>
        </DashboardCard>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            tab === 'catalog' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="h-4 w-4" /> Policy Catalog
        </button>
        <button
          type="button"
          onClick={() => setTab('owned')}
          className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            tab === 'owned' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> My Policies
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : tab === 'catalog' ? (
        <section>
          {catalog.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white">
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
      ) : (
        <section className="space-y-4">
          {myPolicies.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white">
              <p className="text-sm text-slate-500">You haven't purchased any policies yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myPolicies.map((cp) => (
                <div
                  key={cp.id}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  onClick={() => setDetailPolicy(cp)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-brand-600">{cp.carrierName}</p>
                      <h4 className="mt-1 text-base font-semibold text-ink-900">{cp.policyName}</h4>
                      <p className="mt-1 font-mono text-sm text-slate-500">{cp.uniquePolicyNumber}</p>
                    </div>
                    <StatusBadge variant={cp.active ? 'active' : 'expired'}>
                      {cp.active ? 'Active' : 'Expired'}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-6 text-sm">
                    <div><span className="text-slate-500">Coverage: </span><span className="font-semibold text-ink-900">{formatCurrency(cp.coverageAmount)}</span></div>
                    <div><span className="text-slate-500">Premium: </span><span className="font-semibold text-ink-900">{formatCurrency(cp.premiumAmount)}</span></div>
                    <div><span className="text-slate-500">Purchased: </span><span className="font-medium">{cp.purchaseDate}</span></div>
                    <div><span className="text-slate-500">Expires: </span><span className="font-medium">{cp.expiryDate}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
            <button type="button" onClick={() => { setSuccessResult(null); setTab('owned'); }}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              View My Policies
            </button>
          </div>
        )}
      </Modal>

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

export default CustomerPage;
