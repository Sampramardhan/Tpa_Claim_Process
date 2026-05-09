import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSearch, FileText, Plus, RefreshCw, ScanSearch, Upload } from 'lucide-react';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createClaim, getDocumentViewUrl, getMyClaim, getMyClaims, submitClaim, updateClaimExtractedData } from '../services/api/claimApi.js';
import { getMyPolicies } from '../services/api/policyApi.js';

const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const OCR_POLL_INTERVAL_MS = 2500;

const STATUS_VARIANTS = {
  DRAFT: 'info',
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'pending',
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'info',
  PAID: 'active',
};

const STAGE_VARIANTS = {
  DRAFT: 'info',
  CLIENT_REVIEW: 'pending',
  CLIENT_REJECTED: 'expired',
  FMG_REVIEW: 'active',
  CUSTOMER_SUBMITTED: 'pending',
  CUSTOMER: 'info',
  CLIENT: 'pending',
  FMG: 'pending',
  CARRIER: 'pending',
  COMPLETED: 'active',
};

const OCR_STATUS_VARIANTS = {
  PENDING: 'pending',
  PROCESSING: 'pending',
  COMPLETED: 'active',
  FAILED: 'expired',
};

const EMPTY_EXTRACTED_FORM = {
  policyNumber: '',
  customerName: '',
  patientName: '',
  carrierName: '',
  policyName: '',
  hospitalName: '',
  admissionDate: '',
  dischargeDate: '',
  claimedAmount: '',
  claimType: '',
  diagnosis: '',
  billNumber: '',
  billDate: '',
  totalBillAmount: '',
};

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

function extractErrorMessage(error) {
  const response = error?.response?.data;
  if (response?.message) {
    return response.message;
  }
  return 'Unable to complete this claim action right now.';
}

function isTerminalOcrStatus(status) {
  return status === 'COMPLETED' || status === 'FAILED';
}

function isDraftClaim(claim) {
  return claim?.status === 'DRAFT' && claim?.stage === 'DRAFT';
}

function buildEditableForm(extractedData) {
  if (!extractedData) {
    return { ...EMPTY_EXTRACTED_FORM };
  }

  return {
    policyNumber: extractedData.policyNumber || '',
    customerName: extractedData.customerName || '',
    patientName: extractedData.patientName || '',
    carrierName: extractedData.carrierName || '',
    policyName: extractedData.policyName || '',
    hospitalName: extractedData.hospitalName || '',
    admissionDate: extractedData.admissionDate || '',
    dischargeDate: extractedData.dischargeDate || '',
    claimedAmount: extractedData.claimedAmount ?? '',
    claimType: extractedData.claimType || '',
    diagnosis: extractedData.diagnosis || '',
    billNumber: extractedData.billNumber || '',
    billDate: extractedData.billDate || '',
    totalBillAmount: extractedData.totalBillAmount ?? '',
  };
}

function toNullableNumber(value) {
  return value === '' ? null : Number(value);
}

function CustomerClaimsPage() {
  const { user, token } = useAuth();
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowStep, setWorkflowStep] = useState('create');
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [customerPolicyId, setCustomerPolicyId] = useState('');
  const [claimForm, setClaimForm] = useState(null);
  const [hospitalDocument, setHospitalDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingExtractedData, setSavingExtractedData] = useState(false);
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [extractedForm, setExtractedForm] = useState({ ...EMPTY_EXTRACTED_FORM });
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitConfirmationError, setSubmitConfirmationError] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const activeClaimsList = claims.filter(c => c.status !== 'PAID' && c.status !== 'REJECTED');
  const historyClaimsList = claims.filter(c => c.status === 'PAID' || c.status === 'REJECTED');
  const displayClaims = activeTab === 'active' ? activeClaimsList : historyClaimsList;

  const activePolicies = policies.filter((policy) => policy.active);
  const draftClaims = claims.filter((claim) => claim.status === 'DRAFT').length;
  const submittedClaims = claims.filter((claim) => claim.status === 'SUBMITTED').length;
  const readyClaims = claims.filter((claim) => claim.ocrStatus === 'COMPLETED').length;
  const processingClaims = claims.filter((claim) => claim.ocrStatus === 'PENDING' || claim.ocrStatus === 'PROCESSING').length;

  const loadClaims = useCallback(async () => {
    try {
      const data = await getMyClaims();
      setClaims(data || []);
    } catch {
      setClaims([]);
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    try {
      const data = await getMyPolicies();
      setPolicies(data || []);
    } catch {
      setPolicies([]);
    }
  }, []);

  const loadClaimDetails = useCallback(async (claimId) => {
    const data = await getMyClaim(claimId);
    setActiveClaimDetails(data);

    if (data?.extractedData) {
      setExtractedForm(buildEditableForm(data.extractedData));
      if (isTerminalOcrStatus(data.extractedData.ocrStatus)) {
        setWorkflowStep('review');
      } else {
        setWorkflowStep('processing');
      }
    } else {
      setExtractedForm({ ...EMPTY_EXTRACTED_FORM });
      setWorkflowStep('processing');
    }

    if (data?.documents?.length > 0) {
      setSelectedDocumentId(data.documents[0].id);
    } else {
      setSelectedDocumentId(null);
    }

    return data;
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadClaims(), loadPolicies()]).finally(() => setLoading(false));
  }, [loadClaims, loadPolicies]);

  useEffect(() => {
    if (!isWorkflowModalOpen || workflowStep !== 'processing' || !activeClaimId) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const data = await loadClaimDetails(activeClaimId);
        if (isTerminalOcrStatus(data?.extractedData?.ocrStatus)) {
          window.clearInterval(intervalId);
        }
      } catch (error) {
        setExtractionError(extractErrorMessage(error));
        setWorkflowStep('review');
        window.clearInterval(intervalId);
      }
    }, OCR_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [activeClaimId, isWorkflowModalOpen, loadClaimDetails, workflowStep]);

  const resetCreateForm = () => {
    setCustomerPolicyId('');
    setClaimForm(null);
    setHospitalDocument(null);
    setUploadProgress(0);
    setFormError('');
    setExtractionError('');
    setExtractedForm({ ...EMPTY_EXTRACTED_FORM });
  };

  const openCreateModal = () => {
    resetCreateForm();
    setSuccessMessage('');
    setActiveClaimId(null);
    setActiveClaimDetails(null);
    setIsSubmitConfirmOpen(false);
    setSubmitConfirmationError('');
    setWorkflowStep('create');
    setIsWorkflowModalOpen(true);
  };

  const closeWorkflowModal = (force = false) => {
    if (!force && (submitting || savingExtractedData || finalSubmitting || isSubmitConfirmOpen)) return;
    setIsWorkflowModalOpen(false);
    setWorkflowStep('create');
    setActiveClaimId(null);
    setActiveClaimDetails(null);
    setSelectedDocumentId(null);
    setIsSubmitConfirmOpen(false);
    setSubmitConfirmationError('');
    resetCreateForm();
  };

  const closeSubmitConfirmation = (force = false) => {
    if (!force && finalSubmitting) {
      return;
    }

    setIsSubmitConfirmOpen(false);
    setSubmitConfirmationError('');
  };

  const openClaimReview = async (claimId) => {
    setSuccessMessage('');
    setFormError('');
    setExtractionError('');
    setSubmitConfirmationError('');
    setIsSubmitConfirmOpen(false);
    setActiveClaimId(claimId);
    setActiveClaimDetails(null);
    setWorkflowStep('processing');
    setIsWorkflowModalOpen(true);

    try {
      const data = await loadClaimDetails(claimId);
      if (!data?.extractedData) {
        setExtractionError('No OCR extraction record is available for this claim yet.');
        setWorkflowStep('review');
      }
    } catch (error) {
      setExtractionError(extractErrorMessage(error));
      setWorkflowStep('review');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (!customerPolicyId) {
      setFormError('Please select a policy for this claim.');
      return;
    }

    if (!claimForm || !hospitalDocument) {
      setFormError('Claim form and combined hospital document are both required.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const createdClaim = await createClaim(
        {
          customerPolicyId,
          claimForm,
          hospitalDocument,
        },
        setUploadProgress,
      );

      await loadClaims();
      setActiveClaimId(createdClaim.id);
      setWorkflowStep('processing');
      setExtractionError('');

      try {
        const data = await loadClaimDetails(createdClaim.id);
        if (!data?.extractedData) {
          setExtractionError('OCR extraction has not produced a structured record yet.');
          setWorkflowStep('review');
        }
      } catch (error) {
        setExtractionError(extractErrorMessage(error));
        setWorkflowStep('review');
      }
    } catch (error) {
      setFormError(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExtractedFieldChange = (field, value) => {
    setExtractedForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const buildExtractedDataPayload = () => ({
    policyNumber: extractedForm.policyNumber || null,
    customerName: extractedForm.customerName || null,
    patientName: extractedForm.patientName || null,
    carrierName: extractedForm.carrierName || null,
    policyName: extractedForm.policyName || null,
    hospitalName: extractedForm.hospitalName || null,
    admissionDate: extractedForm.admissionDate || null,
    dischargeDate: extractedForm.dischargeDate || null,
    claimedAmount: toNullableNumber(extractedForm.claimedAmount),
    claimType: extractedForm.claimType || null,
    diagnosis: extractedForm.diagnosis || null,
    billNumber: extractedForm.billNumber || null,
    billDate: extractedForm.billDate || null,
    totalBillAmount: toNullableNumber(extractedForm.totalBillAmount),
  });

  const handleSaveExtractedData = async (event) => {
    event.preventDefault();
    if (!activeClaimId || !isDraftClaim(activeClaimDetails?.claim)) {
      return;
    }

    setSavingExtractedData(true);
    setFormError('');
    setExtractionError('');
    setSubmitConfirmationError('');

    try {
      await updateClaimExtractedData(activeClaimId, buildExtractedDataPayload());
      await loadClaims();
      setSuccessMessage('Draft claim data saved successfully.');
      closeWorkflowModal(true);
    } catch (error) {
      setExtractionError(extractErrorMessage(error));
    } finally {
      setSavingExtractedData(false);
    }
  };

  const handleOpenSubmitConfirmation = () => {
    if (!activeClaimId || !isDraftClaim(activeClaimDetails?.claim) || !isTerminalOcrStatus(activeClaimDetails?.extractedData?.ocrStatus)) {
      return;
    }

    setSubmitConfirmationError('');
    setIsSubmitConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!activeClaimId || !isDraftClaim(activeClaimDetails?.claim)) {
      return;
    }

    setFinalSubmitting(true);
    setFormError('');
    setExtractionError('');
    setSubmitConfirmationError('');

    try {
      await updateClaimExtractedData(activeClaimId, buildExtractedDataPayload());
      const submittedClaim = await submitClaim(activeClaimId);
      await loadClaims();
      setSuccessMessage(`Claim ${submittedClaim.claimNumber} submitted successfully and moved to client review.`);
      closeSubmitConfirmation(true);
      closeWorkflowModal(true);
    } catch (error) {
      const message = extractErrorMessage(error);
      setExtractionError(message);
      setSubmitConfirmationError(message);
    } finally {
      setFinalSubmitting(false);
    }
  };

  const activeClaim = activeClaimDetails?.claim;
  const activeOcrStatus = activeClaimDetails?.extractedData?.ocrStatus;
  const activeOcrFailureReason = activeClaimDetails?.extractedData?.ocrFailureReason;
  const activeClaimIsDraft = isDraftClaim(activeClaim);
  const activeClaimLocked = Boolean(activeClaim) && !activeClaimIsDraft;
  const hasActiveExtractedData = Boolean(activeClaimDetails?.extractedData);
  const canSaveDraft = activeClaimIsDraft && hasActiveExtractedData;
  const canFinalSubmit = canSaveDraft && isTerminalOcrStatus(activeOcrStatus);
  const workflowTitle = workflowStep === 'create'
    ? 'Create New Claim'
    : workflowStep === 'processing'
      ? 'OCR Extraction in Progress'
      : activeClaimLocked
        ? 'Submitted Claim Details'
        : 'Review Draft Claim';

  return (
    <PageShell title="Claims Dashboard" eyebrow="Customer Claims">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Policy Holder" title={user?.fullName || 'Customer'}>
          <p className="text-sm text-slate-500">Create new claims against your purchased policies and upload the required PDFs.</p>
        </DashboardCard>
        <DashboardCard eyebrow="Draft Claims" title={String(draftClaims)}>
          <p className="text-sm text-slate-500">{submittedClaims} claims finally submitted</p>
        </DashboardCard>
        <DashboardCard eyebrow="OCR Queue" title={String(processingClaims)}>
          <p className="text-sm text-slate-500">{readyClaims} claims are ready for review.</p>
        </DashboardCard>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">My Claims</h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload the required claim documents, review OCR output in draft, and finally submit when everything looks right.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={activePolicies.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Claim
          </button>
        </div>

        {successMessage ? (
          <div className="mt-6 flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'active'
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Claims
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'history'
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            History
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <LoadingSpinner label="Loading claims" />
          </div>
        ) : displayClaims.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h4 className="mt-3 text-base font-semibold text-ink-900">No claims found</h4>
            <p className="mt-2 text-sm text-slate-500">
              {activeTab === 'active' ? 'Start a new claim by selecting one of your active policies and uploading the required documents.' : 'You have no historical claims yet.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {displayClaims.map((claim) => (
              <article key={claim.id} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{claim.carrierName}</p>
                    <h4 className="mt-1 text-lg font-semibold text-ink-900">{claim.claimNumber}</h4>
                    <p className="mt-1 text-sm text-slate-500">{claim.policyName}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">{claim.customerPolicyNumber}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge variant={STATUS_VARIANTS[claim.status] || 'info'}>
                      {humanize(claim.status)}
                    </StatusBadge>
                    <StatusBadge variant={STAGE_VARIANTS[claim.stage] || 'info'}>{humanize(claim.stage)}</StatusBadge>
                    <StatusBadge variant={OCR_STATUS_VARIANTS[claim.ocrStatus] || 'info'}>
                      OCR {humanize(claim.ocrStatus || 'PENDING')}
                    </StatusBadge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Final Submitted</p>
                    <p className="mt-1 font-medium text-ink-900">
                      {claim.submissionDate ? formatDateTime(claim.submissionDate) : 'Not submitted yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Created</p>
                    <p className="mt-1 font-medium text-ink-900">{formatDateTime(claim.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Documents</p>
                    <p className="mt-1 font-medium text-ink-900">Claim Form and Hospital Document uploaded</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openClaimReview(claim.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    <ScanSearch className="h-4 w-4" aria-hidden="true" />
                    {isDraftClaim(claim) ? 'Review Draft Claim' : 'View Submitted Claim'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal open={isWorkflowModalOpen} onClose={closeWorkflowModal} title={workflowTitle} wide>
        {workflowStep === 'create' ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {formError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="customerPolicyId" className="text-sm font-medium text-ink-900">
                Select Policy
              </label>
              <select
                id="customerPolicyId"
                value={customerPolicyId}
                onChange={(event) => setCustomerPolicyId(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                disabled={submitting}
              >
                <option value="">Choose one of your active policies</option>
                {activePolicies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.policyName} - {policy.uniquePolicyNumber}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-sm font-medium text-ink-900">Claim Form</span>
                <span className="mt-1 block text-xs text-slate-500">Required. PDF, JPG, JPEG, or PNG.</span>
                <input
                  type="file"
                  accept={DOCUMENT_ACCEPT}
                  onChange={(event) => setClaimForm(event.target.files?.[0] || null)}
                  disabled={submitting}
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
                />
                <span className="mt-3 block text-xs text-slate-500">{claimForm?.name || 'No file selected yet.'}</span>
              </label>

              <label className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-sm font-medium text-ink-900">Combined Hospital Document</span>
                <span className="mt-1 block text-xs text-slate-500">Required. PDF, JPG, JPEG, or PNG.</span>
                <input
                  type="file"
                  accept={DOCUMENT_ACCEPT}
                  onChange={(event) => setHospitalDocument(event.target.files?.[0] || null)}
                  disabled={submitting}
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
                />
                <span className="mt-3 block text-xs text-slate-500">{hospitalDocument?.name || 'No file selected yet.'}</span>
              </label>
            </div>

            {submitting ? (
              <div className="rounded-md border border-brand-100 bg-brand-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-sm text-brand-700">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>Uploading claim documents</span>
                  </div>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeWorkflowModal}
                disabled={submitting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || activePolicies.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                Create Draft Claim
              </button>
            </div>
          </form>
        ) : workflowStep === 'processing' ? (
          <div className="space-y-5">
            <div className="flex justify-center">
              <LoadingSpinner label="Processing OCR extraction" />
            </div>
            <div className="rounded-md border border-brand-100 bg-brand-50 px-5 py-5 text-center text-sm text-brand-700">
              <ScanSearch className="mx-auto h-8 w-8" aria-hidden="true" />
              <p className="mt-3 font-semibold">Google AI Studio is processing your uploaded claim documents.</p>
              <p className="mt-2 text-brand-600">
                This runs once per claim. The extracted fields will appear here automatically when processing completes.
              </p>
            </div>
            {activeClaimDetails?.claim ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-ink-900">{activeClaimDetails.claim.claimNumber}</p>
                <p className="mt-1">{activeClaimDetails.claim.policyName}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="bg-slate-100/50 h-full p-6">
            <div className="flex h-full gap-6">
              {/* Screen 1: Document View Panel */}
              <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[60%]">
                <div className="border-b border-slate-100 bg-white px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Document Source</h4>
                      <p className="text-sm font-bold text-slate-800">Original Uploaded File</p>
                    </div>
                    {activeClaimDetails?.documents?.length > 0 && (
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                        {activeClaimDetails.documents.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setSelectedDocumentId(doc.id)}
                            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                              selectedDocumentId === doc.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {humanize(doc.documentType)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex-1 w-full bg-slate-800">
                  {selectedDocumentId ? (
                    <DocumentViewer
                      url={getDocumentViewUrl(activeClaimId, selectedDocumentId, token)}
                      title="Claim Document Preview"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
                      <FileSearch className="h-12 w-12 opacity-20 text-white" />
                      <p className="mt-2 text-sm text-slate-400">Select a document to preview</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Screen 2: Data Extraction Panel */}
              <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[40%]">
                <div className="border-b border-slate-100 bg-white px-5 py-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Extraction Result</h4>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">Verification Form</p>
                    <StatusBadge variant={OCR_STATUS_VARIANTS[activeOcrStatus] || 'info'}>
                      {humanize(activeOcrStatus || 'PENDING')}
                    </StatusBadge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                  <form className="space-y-8" onSubmit={handleSaveExtractedData}>
                    {extractionError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {extractionError}
                      </div>
                    ) : null}

                    {activeClaim ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant={STATUS_VARIANTS[activeClaim.status] || 'info'}>
                            {humanize(activeClaim.status)}
                          </StatusBadge>
                          <StatusBadge variant={STAGE_VARIANTS[activeClaim.stage] || 'info'}>
                            {humanize(activeClaim.stage)}
                          </StatusBadge>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-600">
                          <p className="font-semibold text-ink-900">{activeClaim.claimNumber}</p>
                          <p>{activeClaim.policyName}</p>
                          <p>
                            {activeClaim.submissionDate
                              ? `Submitted on ${formatDateTime(activeClaim.submissionDate)}`
                              : 'Still in draft. Final submission will lock this claim and move it to client review.'}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {activeClaimLocked ? (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                        This claim has already been finally submitted. The extracted fields are now read-only.
                      </div>
                    ) : activeOcrStatus === 'FAILED' ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                          <div>
                            <p className="font-semibold">OCR could not complete automatically.</p>
                            <p className="mt-1">{activeOcrFailureReason || 'You can still correct the extracted fields manually and submit the claim when ready.'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span>Review the extracted fields, save the draft if needed, then use Final Submit Claim when you're ready to lock it.</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                          <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Policy Context</h5>
                        </div>
                        <div className="grid gap-4">
                          <EditableField label="Policy Number" value={extractedForm.policyNumber} onChange={(value) => handleExtractedFieldChange('policyNumber', value)} disabled={activeClaimLocked} />
                          <EditableField label="Policy Name" value={extractedForm.policyName} onChange={(value) => handleExtractedFieldChange('policyName', value)} disabled={activeClaimLocked} />
                          <EditableField label="Carrier Name" value={extractedForm.carrierName} onChange={(value) => handleExtractedFieldChange('carrierName', value)} disabled={activeClaimLocked} />
                          <EditableField label="Claim Type" value={extractedForm.claimType} onChange={(value) => handleExtractedFieldChange('claimType', value)} disabled={activeClaimLocked} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                          <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Patient & Hospital</h5>
                        </div>
                        <div className="grid gap-4">
                          <EditableField label="Customer Name" value={extractedForm.customerName} onChange={(value) => handleExtractedFieldChange('customerName', value)} disabled={activeClaimLocked} />
                          <EditableField label="Patient Name" value={extractedForm.patientName} onChange={(value) => handleExtractedFieldChange('patientName', value)} disabled={activeClaimLocked} />
                          <EditableField label="Hospital Name" value={extractedForm.hospitalName} onChange={(value) => handleExtractedFieldChange('hospitalName', value)} disabled={activeClaimLocked} />
                          <div className="grid grid-cols-2 gap-4">
                            <EditableField label="Admission" type="date" value={extractedForm.admissionDate} onChange={(value) => handleExtractedFieldChange('admissionDate', value)} disabled={activeClaimLocked} />
                            <EditableField label="Discharge" type="date" value={extractedForm.dischargeDate} onChange={(value) => handleExtractedFieldChange('dischargeDate', value)} disabled={activeClaimLocked} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                          <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Financials & Diagnosis</h5>
                        </div>
                        <div className="grid gap-4">
                          <div className="grid grid-cols-2 gap-4">
                            <EditableField label="Claimed Amt" type="number" value={extractedForm.claimedAmount} onChange={(value) => handleExtractedFieldChange('claimedAmount', value)} disabled={activeClaimLocked} />
                            <EditableField label="Total Bill" type="number" value={extractedForm.totalBillAmount} onChange={(value) => handleExtractedFieldChange('totalBillAmount', value)} disabled={activeClaimLocked} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <EditableField label="Bill No" value={extractedForm.billNumber} onChange={(value) => handleExtractedFieldChange('billNumber', value)} disabled={activeClaimLocked} />
                            <EditableField label="Bill Date" type="date" value={extractedForm.billDate} onChange={(value) => handleExtractedFieldChange('billDate', value)} disabled={activeClaimLocked} />
                          </div>
                          <EditableField label="Diagnosis" type="textarea" value={extractedForm.diagnosis} onChange={(value) => handleExtractedFieldChange('diagnosis', value)} disabled={activeClaimLocked} />
                        </div>
                      </div>

                      {activeClaimDetails?.timeline?.length ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-l-4 border-brand-500 pl-3">
                            <h5 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Claim Timeline</h5>
                          </div>
                          <TimelineShell entries={activeClaimDetails.timeline} />
                        </div>
                      ) : null}
                    </div>

                    <div className="sticky bottom-0 -mx-6 -mb-6 mt-10 border-t border-slate-100 bg-slate-50 p-6 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={closeWorkflowModal}
                          disabled={savingExtractedData || finalSubmitting}
                          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-white disabled:opacity-60"
                        >
                          {activeClaimLocked ? 'Close' : 'Cancel'}
                        </button>
                        {activeClaimLocked ? null : (
                          <>
                            <button
                              type="submit"
                              disabled={!canSaveDraft || savingExtractedData || finalSubmitting}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingExtractedData ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Save Draft
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenSubmitConfirmation}
                              disabled={!canFinalSubmit || savingExtractedData || finalSubmitting}
                              className="flex-[1.2] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {finalSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Final Submit Claim
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={isSubmitConfirmOpen} onClose={closeSubmitConfirmation} title="Final Submit Claim">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will move the claim from draft to customer submitted, lock further edits, and place it in the client review queue.
          </p>
          {activeClaim ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-ink-900">{activeClaim.claimNumber}</p>
              <p className="mt-1">{activeClaim.policyName}</p>
              <p className="mt-2 text-slate-500">Any unsaved extracted field changes will be saved automatically before submission.</p>
            </div>
          ) : null}
          {submitConfirmationError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitConfirmationError}
            </div>
          ) : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeSubmitConfirmation}
              disabled={finalSubmitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={finalSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finalSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Confirm Submission
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

function EditableField({ label, value, onChange, type = 'text', disabled = false }) {
  const baseClasses = `w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-ink-900 shadow-sm transition duration-200 ${
    disabled
      ? 'cursor-not-allowed bg-slate-100 text-slate-500'
      : 'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 hover:border-brand-300'
  }`;

  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={baseClasses}
          disabled={disabled}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={baseClasses}
          disabled={disabled}
        />
      )}
    </label>
  );
}

export default CustomerClaimsPage;
