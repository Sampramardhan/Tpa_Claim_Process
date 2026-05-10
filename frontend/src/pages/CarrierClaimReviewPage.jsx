import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSearch, RefreshCw, ShieldCheck, XCircle, ArrowLeft } from 'lucide-react';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import ReviewField from '../components/claims/ReviewField.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  getCarrierClaim,
  approveCarrierPayment,
  rejectCarrierClaim,
  getCarrierDocumentViewUrl
} from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = { UNDER_REVIEW: 'info', PAID: 'active', REJECTED: 'expired' };
const STAGE_VARIANTS = { CARRIER_REVIEW: 'pending', COMPLETED: 'active' };

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function humanize(value) {
  return value?.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function DocumentPanel({ title, document, url, claimDetails, selectedDocumentId, onSelectDocument }) {
  return (
    <section className="flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {claimDetails?.documents?.length > 0 && (
          <div className="flex gap-1">
            {claimDetails.documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${selectedDocumentId === doc.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                {humanize(doc.documentType)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1 bg-slate-800">
        {url ? <DocumentViewer url={url} title={`${title} Preview`} /> : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
            <FileSearch className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No document available for preview.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CarrierClaimReviewPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [claimDetails, setClaimDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);

  const loadClaimDetails = useCallback(async (claimId) => {
    setLoadingDetails(true);
    setError('');
    try {
      const data = await getCarrierClaim(claimId);
      setClaimDetails(data);
      if (data?.documents?.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(data.documents[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load claim details.');
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    if (id) {
      loadClaimDetails(id);
    }
  }, [id, loadClaimDetails]);

  const handleAction = async (type) => {
    setActionLoading(type);
    setError('');
    setSuccess('');
    try {
      if (type === 'approve') {
        await approveCarrierPayment(id, { reviewerNotes });
        setSuccess('Payment approved successfully.');
      } else {
        if (!reviewerNotes.trim()) {
          throw new Error('Rejection notes are required.');
        }
        await rejectCarrierClaim(id, { reviewerNotes });
        setSuccess('Claim rejected successfully.');
      }
      setShowConfirm(null);
      await loadClaimDetails(id);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setActionLoading('');
    }
  };

  if (loadingDetails) {
    return (
      <PageShell title="Carrier Review" eyebrow="Carrier Portal">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
  }

  if (!claimDetails) {
    return (
      <PageShell title="Claim Not Found" eyebrow="Carrier Portal">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Queue
          </button>
        </div>
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700">
          {error || 'Could not load the requested claim.'}
        </div>
      </PageShell>
    );
  }

  const activeClaim = claimDetails.claim;

  return (
    <PageShell title={activeClaim?.claimNumber ? `Carrier Review • ${activeClaim.claimNumber}` : 'Carrier Claim Review'} eyebrow="Carrier Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </button>
      </div>

      <div className="flex flex-col bg-slate-100/50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-12rem)] min-h-[700px]">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">{activeClaim.customerName}</p>
              <p className="mt-1 text-sm text-slate-500">{activeClaim.policyName} | {activeClaim.carrierName}</p>
              <p className="mt-2 text-xs text-slate-400">Submitted {formatDateTime(activeClaim.submissionDate)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant={CLAIM_STATUS_VARIANTS[activeClaim.status] || 'info'}>{humanize(activeClaim.status)}</StatusBadge>
            </div>
          </div>
        </div>

        <div className="p-6 pb-0">
          <TimelineShell entries={claimDetails.timeline || []} />
        </div>

        <div className="grid flex-1 gap-6 overflow-hidden p-6 pt-0 lg:grid-cols-[1fr,1fr]">
          <DocumentPanel 
            title="Document Preview" 
            claimDetails={claimDetails}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={setSelectedDocumentId}
            url={selectedDocumentId ? getCarrierDocumentViewUrl(id, selectedDocumentId, token) : null} 
          />

          <section className="flex flex-col space-y-6 overflow-y-auto pr-1">
            {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center gap-2"><XCircle className="h-4 w-4" /> {error}</div>}
            {success && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</div>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Claim Context</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField label="Claim Number" value={activeClaim.claimNumber} mono />
                <ReviewField label="Customer" value={activeClaim.customerName} />
                <ReviewField label="Policy No." value={activeClaim.customerPolicyNumber} mono />
                <ReviewField label="Policy Name" value={activeClaim.policyName} />
                <ReviewField label="Submitted" value={formatDateTime(activeClaim.submissionDate)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">OCR Extracted Data</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField label="Hospital" value={claimDetails.extractedData?.hospitalName} />
                <ReviewField label="Admission" value={claimDetails.extractedData?.admissionDate} />
                <ReviewField label="Discharge" value={claimDetails.extractedData?.dischargeDate} />
                <ReviewField label="Claimed Amount" value={formatCurrency(claimDetails.extractedData?.claimedAmount)} />
                <ReviewField label="Total Bill" value={formatCurrency(claimDetails.extractedData?.totalBillAmount)} />
              </div>
              <div className="mt-4">
                <ReviewField label="Diagnosis" value={claimDetails.extractedData?.diagnosis} multiline />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">FMG Decision</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-700">Recommended:</span>
                  <StatusBadge variant={claimDetails.fmgDecision?.recommendedDecision === 'APPROVED' ? 'active' : 'expired'}>
                    {humanize(claimDetails.fmgDecision?.recommendedDecision)}
                  </StatusBadge>
                </div>
                {claimDetails.manualReview && (
                  <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700 border border-indigo-100 shadow-sm">
                    <p className="font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> FMG Manual Override</p>
                    <p className="mt-2 italic">"{claimDetails.manualReview.reviewerNotes}"</p>
                  </div>
                )}
              </div>
            </section>



            {!success && activeClaim.stage === 'CARRIER_REVIEW' && (
              <section className="sticky bottom-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg z-10">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Carrier Settlement Action</h4>
                <textarea 
                  value={reviewerNotes} 
                  onChange={(e) => setReviewerNotes(e.target.value)} 
                  placeholder="Enter settlement notes..." 
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm mb-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow" 
                  rows={2} 
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowConfirm('reject')} className="flex-1 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 hover:bg-red-100 transition-colors">Reject Claim</button>
                  <button onClick={() => setShowConfirm('approve')} className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 shadow-sm transition-colors">Approve Payment</button>
                </div>
              </section>
            )}
            {activeClaim.stage === 'COMPLETED' && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-blue-800">Carrier Review Completed</p>
                <p className="mt-1 text-sm text-blue-600">This claim has been processed by the Carrier and is fully resolved.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal open={!!showConfirm} onClose={() => setShowConfirm(null)} title="Confirm Settlement Decision">
        <div className="p-4">
          <div className={`flex items-center gap-3 rounded-lg p-4 ${showConfirm === 'approve' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
            {showConfirm === 'approve' ? <ShieldCheck className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            <div>
              <p className="font-bold">Confirm {showConfirm === 'approve' ? 'Payment Approval' : 'Rejection'}</p>
              <p className="text-sm opacity-90">This is a terminal action and will complete the claim lifecycle.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setShowConfirm(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">Cancel</button>
            <button onClick={() => handleAction(showConfirm)} disabled={!!actionLoading} className={`rounded-md px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors ${showConfirm === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
              {actionLoading ? 'Processing...' : `Yes, Confirm ${showConfirm === 'approve' ? 'Payment' : 'Rejection'}`}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

export default CarrierClaimReviewPage;
