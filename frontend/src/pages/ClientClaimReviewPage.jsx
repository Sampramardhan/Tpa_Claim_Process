import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getClientClaim, getClientDocumentViewUrl } from '../services/api/claimApi.js';

const CLAIM_STATUS_VARIANTS = {
  DRAFT: 'info',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'info',
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'info',
  PAID: 'active',
};
const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };
const STAGE_VARIANTS = {
  CLIENT_REVIEW: 'pending',
  CUSTOMER_SUBMITTED: 'pending',
  CLIENT_REJECTED: 'expired',
  FMG_REVIEW: 'active',
  DRAFT: 'info',
};
const VALIDATION_STATUS_VARIANTS = { PENDING: 'pending', PASSED: 'active', FAILED: 'expired' };
const REVIEW_DECISION_VARIANTS = { PENDING: 'info', FORWARDED_TO_FMG: 'active', REJECTED: 'expired' };

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function humanize(value) {
  return value
    ?.toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractErrorMessage(error, fallback = 'Unable to complete this action right now.') {
  return error?.response?.data?.message || fallback;
}

function ReviewField({ label, value, multiline = false }) {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 ${multiline ? 'sm:col-span-2' : ''}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-medium text-ink-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {hasValue ? String(value) : 'Not available'}
      </p>
    </div>
  );
}

function ClientClaimReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const applyClaimDetails = useCallback((data) => {
    setActiveClaimDetails(data);
    setSelectedDocumentId((current) => {
      if (!data?.documents?.length) {
        return null;
      }
      return current && data.documents.some((doc) => doc.id === current) ? current : data.documents[0].id;
    });
  }, []);

  const loadClientClaimDetails = useCallback(async (claimId) => {
    setReviewLoading(true);
    setReviewError('');
    try {
      const data = await getClientClaim(claimId);
      applyClaimDetails(data);
      return data;
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to load claim review details.'));
    } finally {
      setReviewLoading(false);
    }
  }, [applyClaimDetails]);

  useEffect(() => {
    if (id) {
      loadClientClaimDetails(id);
    }
  }, [id, loadClientClaimDetails]);

  if (reviewLoading) {
    return (
      <PageShell title="Client Review" eyebrow="Client Portal">
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      </PageShell>
    );
  }

  if (!activeClaimDetails) {
    return (
      <PageShell title="Claim Not Found" eyebrow="Client Portal">
        <div className="mb-6">
          <button
            onClick={() => navigate('/client/queue')}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Queue
          </button>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p>{reviewError || 'Could not load the requested claim.'}</p>
        </div>
      </PageShell>
    );
  }

  const activeClaim = activeClaimDetails.claim;
  const activeValidation = activeClaimDetails.validation;
  const selectedDocumentUrl = selectedDocumentId
    ? getClientDocumentViewUrl(id, selectedDocumentId, token)
    : null;

  return (
    <PageShell title={activeClaim?.claimNumber ? `Client Review • ${activeClaim.claimNumber}` : 'Client Claim Review'} eyebrow="Client Portal">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/client/queue')}
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
            {selectedDocumentUrl ? (
              <DocumentViewer url={selectedDocumentUrl} title="Client Claim Document Preview" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                <FileSearch className="h-12 w-12 opacity-20 text-white" />
                <p className="mt-2 text-sm text-slate-400">Select a document to preview</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Data Verification Panel (40% width) */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[40%]">
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Verification Result</h4>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Deterministic Client Checks</p>
              <StatusBadge variant={CLAIM_STATUS_VARIANTS[activeClaim.status] || 'info'}>
                {humanize(activeClaim.status)}
              </StatusBadge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-6">
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

            {/* Validation Results block */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm interactive-card transition-all duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Checks Summary</h4>
                  <p className="text-sm font-bold text-slate-800">Verification Checklist</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activeValidation ? (
                    <>
                      <StatusBadge variant={VALIDATION_STATUS_VARIANTS[activeValidation.validationStatus] || 'info'}>
                        {humanize(activeValidation.validationStatus)}
                      </StatusBadge>
                      <StatusBadge variant={REVIEW_DECISION_VARIANTS[activeValidation.reviewDecision] || 'info'}>
                        {humanize(activeValidation.reviewDecision)}
                      </StatusBadge>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3">
                {(activeValidation?.checks || []).map((check) => (
                  <div
                    key={check.code}
                    className={`rounded-xl border px-4 py-3 ${
                      check.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {check.passed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 flex-none text-red-600" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{check.label}</p>
                          <StatusBadge variant={check.passed ? 'active' : 'expired'}>
                            {check.passed ? 'Pass' : 'Fail'}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{check.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* OCR Extracted Data block */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm interactive-card transition-all duration-300">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">OCR Extracted Data</h4>
                <p className="text-sm font-bold text-slate-800">Structured Claim Summary</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReviewField label="Policy Number" value={activeClaimDetails.extractedData?.policyNumber} />
                <ReviewField label="Policy Name" value={activeClaimDetails.extractedData?.policyName} />
                <ReviewField label="Customer Name" value={activeClaimDetails.extractedData?.customerName} />
                <ReviewField label="Patient Name" value={activeClaimDetails.extractedData?.patientName} />
                <ReviewField label="Carrier Name" value={activeClaimDetails.extractedData?.carrierName} />
                <ReviewField label="Hospital Name" value={activeClaimDetails.extractedData?.hospitalName} />
                <ReviewField label="Admission Date" value={activeClaimDetails.extractedData?.admissionDate} />
                <ReviewField label="Discharge Date" value={activeClaimDetails.extractedData?.dischargeDate} />
                <ReviewField label="Claim Type" value={activeClaimDetails.extractedData?.claimType} />
                <ReviewField label="Bill Number" value={activeClaimDetails.extractedData?.billNumber} />
                <ReviewField label="Claimed Amount" value={activeClaimDetails.extractedData?.claimedAmount} />
                <ReviewField label="Total Bill" value={activeClaimDetails.extractedData?.totalBillAmount} />
              </div>
              <div className="mt-3">
                <ReviewField label="Diagnosis" value={activeClaimDetails.extractedData?.diagnosis} multiline />
              </div>
            </section>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default ClientClaimReviewPage;
