import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShoppingBag, FileStack } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import PageShell from '../components/ui/PageShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getPolicyCatalog, getMyPolicies } from '../services/api/policyApi.js';
import { getMyClaims } from '../services/api/claimApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function CustomerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catalogData, policiesData, claimsData] = await Promise.all([
        getPolicyCatalog(),
        getMyPolicies(),
        getMyClaims()
      ]);
      setCatalog(catalogData || []);
      setMyPolicies(policiesData || []);
      setMyClaims(claimsData || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Analytics Data
  const coverageData = useMemo(() => {
    return myPolicies.filter(p => p.active).map(p => ({
      name: p.policyName,
      value: p.coverageAmount
    }));
  }, [myPolicies]);

  const typeDistributionData = useMemo(() => {
    const counts = myPolicies.filter(p => p.active).reduce((acc, p) => {
      acc[p.policyType] = (acc[p.policyType] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value }));
  }, [myPolicies]);

  return (
    <PageShell title="Customer Dashboard" eyebrow="Customer Portal">
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Welcome</p>
          <p className="mt-2 text-xl font-bold text-ink-900 truncate">{user?.fullName}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Policies</p>
          <p className="mt-2 text-3xl font-bold text-brand-600">{myPolicies.filter((p) => p.active).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Plans</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{catalog.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">My Claims</p>
          <p className="mt-2 text-3xl font-bold text-ink-900">{myClaims.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {/* Navigation Cards */}
          <button 
            onClick={() => navigate('/customer/policies')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-sky-50 p-3 text-sky-600 group-hover:bg-sky-100">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-sky-600">My Policies</h3>
            <p className="mt-2 text-sm text-slate-500">
              View your active coverage details, expiration dates, and policy limits.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-600">
              <span>View Policies</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/customer/catalog')}
            className="group flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600 group-hover:bg-emerald-100">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-emerald-600">Available Plans</h3>
            <p className="mt-2 text-sm text-slate-500">
              Browse and purchase new insurance plans tailored to your needs.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <span>Browse Catalog</span> &rarr;
            </div>
          </button>

          <button 
            onClick={() => navigate('/customer/claims')}
            className="group sm:col-span-2 flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3 text-brand-600 group-hover:bg-brand-100">
              <FileStack className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-600">My Claims</h3>
            <p className="mt-2 text-sm text-slate-500">
              Submit new claims, view drafting status, and track the processing stages of your existing claims.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600">
              <span>Manage Claims</span> &rarr;
            </div>
          </button>
        </div>

        <div className="space-y-6">
          {myPolicies.filter(p => p.active).length > 0 && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-ink-900 mb-4">Portfolio Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                        {typeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-ink-900 mb-4">Coverage by Policy</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={coverageData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                        {coverageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default CustomerPage;
