import { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { verifyPolicy } from '../services/api/policyApi.js';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function ClientVerificationPage() {
  const navigate = useNavigate();
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  return (
    <PageShell title="Quick Verification" eyebrow="Client Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/client')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-ink-900">Quick Policy Verification</h3>
        <form onSubmit={handleVerify} className="flex gap-3">
          <div className="relative flex-1 max-w-xl">
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
          <div className="mt-4 max-w-xl rounded-md bg-red-50 p-3 text-sm text-red-700">{verifyError}</div>
        )}

        {verifyResult && (
          <div className="mt-6 max-w-2xl rounded-md border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Policy Verified</span>
              <StatusBadge variant={verifyResult.active ? 'active' : 'expired'}>
                {verifyResult.active ? 'Active' : 'Expired'}
              </StatusBadge>
            </div>
            <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Customer</span> <span className="font-medium text-base">{verifyResult.customerName}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Email</span> <span className="font-medium text-base">{verifyResult.customerEmail}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Policy</span> <span className="font-medium text-base">{verifyResult.policyName}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Carrier</span> <span className="font-medium text-base">{verifyResult.carrierName}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Coverage</span> <span className="font-semibold text-base">{formatCurrency(verifyResult.coverageAmount)}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Policy No</span> <span className="font-mono font-semibold text-base">{verifyResult.uniquePolicyNumber}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Purchased</span> <span className="font-medium text-base">{verifyResult.purchaseDate}</span></p>
              <p><span className="text-slate-500 block text-xs uppercase tracking-wide">Expires</span> <span className="font-medium text-base">{verifyResult.expiryDate}</span></p>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default ClientVerificationPage;
