import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { getAllCustomerPolicies, searchPolicies } from '../services/api/policyApi.js';

const TYPE_LABELS = { HEALTH: 'Health', LIFE: 'Life', AD_AND_D: 'AD&D', CRITICAL_ILLNESS: 'Critical Illness' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function ClientPoliciesPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState(null);

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

  useEffect(() => {
    loadAllPolicies();
  }, [loadAllPolicies]);

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

  return (
    <PageShell title="Customer Policy Records" eyebrow="Client Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/client')}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

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
    </PageShell>
  );
}

export default ClientPoliciesPage;
