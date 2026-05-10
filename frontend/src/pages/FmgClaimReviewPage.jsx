import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, FileSearch, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import ReviewField from '../components/claims/ReviewField.jsx';
import FmgDecisionActionPanel from '../components/fmg/FmgDecisionActionPanel.jsx';
import FmgManualReviewPanel from '../components/fmg/FmgManualReviewPanel.jsx';
import FmgRuleEvaluationPanel from '../components/fmg/FmgRuleEvaluationPanel.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  confirmFmgDecision,
  evaluateFmgClaim,
  getFmgClaim,
  getFmgDocumentViewUrl,
  submitFmgManualReview,
} from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = {
  DRAFT: 'info',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'info',
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'pending',
  PAID: 'active',
};
const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };
const STAGE_VARIANTS = { FMG_REVIEW: 'pending', FMG_MANUAL_REVIEW: 'pending', CARRIER_REVIEW: 'active', COMPLETED: 'expired' };
const DECISION_VARIANTS = { APPROVED: 'active', REJECTED: 'expired', MANUAL_REVIEW: 'pending' };

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return 'Not available';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
}

function humanize(value) {
  return value?.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function extractErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  return error?.response?.data?.message || fallback;
}

function DocumentPanel({ title, claimDetails, selectedDocumentId, onSelectDocument, url }) {
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

function FmgClaimReviewPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const loadClaimDetails = useCallback(async (claimId) => {
    setReviewLoading(true);
    setReviewError('');
    try {
      const data = await getFmgClaim(claimId);
      setActiveClaimDetails(data);
      if (data?.documents?.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(data.documents[0].id);
      }
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to load FMG claim review details.'));
    } finally {
      setReviewLoading(false);
    }
  }, [selectedDocumentId]);

  useEffect(() => {
    if (id) {
      loadClaimDetails(id);
    }
  }, [id, loadClaimDetails]);

  async function handleEvaluateClaim() {
    if (!id) return;
    setActionLoading('evaluate');
    setReviewError('');
    setReviewSuccess('');
    try {
      const data = await evaluateFmgClaim(id);
      setActiveClaimDetails(data);
      setReviewSuccess('FMG evaluation completed. Review the triggered rules, then confirm the final decision.');
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to run FMG evaluation right now.'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleConfirmDecision(decision) {
    if (!id) return;
    setActionLoading(decision);
    setReviewError('');
    setReviewSuccess('');
    try {
      const data = await confirmFmgDecision(id, { decision });
      setActiveClaimDetails(data);
      setReviewSuccess(`FMG confirmed ${humanize(decision)} successfully.`);
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to confirm the FMG decision.'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleSubmitManualReview(decision, reviewerNotes) {
    if (!id) return;
    setActionLoading(decision);
    setReviewError('');
    setReviewSuccess('');
    try {
      const data = await submitFmgManualReview(id, { decision, reviewerNotes });
      setActiveClaimDetails(data);
      setReviewSuccess(`FMG manual review ${humanize(decision)} submitted successfully.`);
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to submit the FMG manual review.'));
    } finally {
      setActionLoading('');
    }
  }

  if (reviewLoading) {
    return (
      <PageShell title="FMG Review" eyebrow="FMG Portal">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
  }

  if (!activeClaimDetails) {
    return (
      <PageShell title="Claim Not Found" eyebrow="FMG Portal">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Queue
          </button>
        </div>
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700">
          {reviewError || 'Could not load the requested claim.'}
        </div>
      </PageShell>
    );
  }

  const activeClaim = activeClaimDetails.claim;
  const activeDecision = activeClaimDetails.fmgDecision;
  const canEvaluateClaim = activeClaim?.status === 'UNDER_REVIEW' && (activeClaim?.stage === 'FMG_REVIEW' || activeClaim?.stage === 'FMG_MANUAL_REVIEW');

  return (
    <PageShell title={activeClaim?.claimNumber ? `FMG Review • ${activeClaim.claimNumber}` : 'FMG Claim Review'} eyebrow="FMG Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </button>
      </div>

      <TimelineShell entries={activeClaimDetails.timeline || []} />

      <div className="flex h-[calc(100vh-8rem)] min-h-[850px] gap-6 animate-fade-in-up">
        {/* Left Panel: Document View Panel (60% width) */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[60%]">
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Document Source</h4>
                <p className="text-sm font-bold text-slate-800">Original Uploaded File</p>
              </div>
              {activeClaimDetails.documents?.length ? (
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  {activeClaimDetails.documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                        selectedDocumentId === document.id
                          ? 'bg-white text-brand-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {humanize(document.documentType)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative flex-1 w-full bg-slate-800">
            {selectedDocumentId ? (
              <DocumentViewer 
                url={getFmgDocumentViewUrl(id, selectedDocumentId, token)} 
                title="FMG Claim Document Preview" 
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                <FileSearch className="h-12 w-12 opacity-20 text-white" />
                <p className="mt-2 text-sm text-slate-400">Select a document to preview</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Data Summary & Actions Panel (40% width) */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[40%]">
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">FMG Audit</h4>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Rule Engine & Override Controls</p>
              <StatusBadge variant={CLAIM_STATUS_VARIANTS[activeClaim.status] || 'info'}>
                {humanize(activeClaim.status)}
              </StatusBadge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
            {reviewError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{reviewError}</div> : null}
            {reviewSuccess ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{reviewSuccess}</div> : null}

            {/* Claim Context Info block */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm interactive-card transition-all duration-300">
              <div className="flex flex-wrap gap-2 mb-3">
                <StatusBadge variant="info">{humanize(activeClaim.status)}</StatusBadge>
              </div>
              <h4 className="text-sm font-bold text-ink-900">{activeClaim.claimNumber || 'Draft Claim'}</h4>
              <p className="mt-1 text-sm text-brand-600 font-medium">{activeClaim.policyName}</p>
              <p className="mt-2 text-xs text-slate-500">
                Submitted {formatDateTime(activeClaim.submissionDate)}
              </p>
            </div>

            {/* Validation / Summary block */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm interactive-card transition-all duration-300">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Claim Summary</h4>
                <p className="text-sm font-bold text-slate-800">Customer, Policy, and Workflow Snapshot</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReviewField label="Claim Number" value={activeClaim.claimNumber} mono />
                <ReviewField label="Policy Number" value={activeClaim.customerPolicyNumber} mono />
                <ReviewField label="Customer Name" value={activeClaim.customerName} />
                <ReviewField label="Customer Email" value={activeClaim.customerEmail} />
                <ReviewField label="Policy Name" value={activeClaim.policyName} />
                <ReviewField label="Carrier" value={activeClaim.carrierName} />
                <ReviewField label="Submission Date" value={formatDateTime(activeClaim.submissionDate)} />
                <ReviewField label="Client Validation" value={activeClaimDetails.clientValidation ? `${humanize(activeClaimDetails.clientValidation.validationStatus)} / ${humanize(activeClaimDetails.clientValidation.reviewDecision)}` : 'Not available'} />
              </div>
            </section>

            {/* Actions Panel */}
            {activeClaim?.stage === 'FMG_MANUAL_REVIEW' ? (
              <FmgManualReviewPanel
                manualReview={activeClaimDetails.manualReview}
                fmgDecision={activeDecision}
                actionLoading={actionLoading}
                onSubmit={handleSubmitManualReview}
              />
            ) : activeClaim?.stage === 'FMG_REVIEW' ? (
              <div className="space-y-6">
                <FmgRuleEvaluationPanel decision={activeDecision} evaluating={actionLoading === 'evaluate'} disabled={!canEvaluateClaim || Boolean(actionLoading && actionLoading !== 'evaluate')} onEvaluate={handleEvaluateClaim} />
                <FmgDecisionActionPanel decision={activeDecision} actionLoading={actionLoading} onConfirm={handleConfirmDecision} />
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-semibold text-blue-800">FMG Review Completed</p>
                <p className="mt-1 text-sm text-blue-600">This claim has already been processed by FMG and is now in the {humanize(activeClaim?.stage)} stage.</p>
              </div>
            )}

            {/* OCR Extracted Data block */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm interactive-card transition-all duration-300">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">OCR Extracted Data</h4>
                <p className="text-sm font-bold text-slate-800">Structured Claim Summary</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReviewField label="Policy Number" value={activeClaimDetails.extractedData?.policyNumber} mono />
                <ReviewField label="Policy Name" value={activeClaimDetails.extractedData?.policyName} />
                <ReviewField label="Customer Name" value={activeClaimDetails.extractedData?.customerName} />
                <ReviewField label="Patient Name" value={activeClaimDetails.extractedData?.patientName} />
                <ReviewField label="Carrier Name" value={activeClaimDetails.extractedData?.carrierName} />
                <ReviewField label="Hospital Name" value={activeClaimDetails.extractedData?.hospitalName} />
                <ReviewField label="Admission Date" value={activeClaimDetails.extractedData?.admissionDate} />
                <ReviewField label="Discharge Date" value={activeClaimDetails.extractedData?.dischargeDate} />
                <ReviewField label="Claim Type" value={activeClaimDetails.extractedData?.claimType} />
                <ReviewField label="Bill Number" value={activeClaimDetails.extractedData?.billNumber} />
                <ReviewField label="Claimed Amount" value={formatCurrency(activeClaimDetails.extractedData?.claimedAmount)} />
                <ReviewField label="Total Bill Amount" value={formatCurrency(activeClaimDetails.extractedData?.totalBillAmount)} />
              </div>
              <div className="mt-3"><ReviewField label="Diagnosis" value={activeClaimDetails.extractedData?.diagnosis} multiline /></div>
            </section>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default FmgClaimReviewPage;
