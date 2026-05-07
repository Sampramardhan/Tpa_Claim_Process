import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Plus, RefreshCw, ScanSearch, Upload } from 'lucide-react';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createClaim, getMyClaim, getMyClaims, updateClaimExtractedData } from '../services/api/claimApi.js';
import { getMyPolicies } from '../services/api/policyApi.js';

const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const OCR_POLL_INTERVAL_MS = 2500;

const STATUS_VARIANTS = {
  SUBMITTED: 'pending',
  UNDER_REVIEW: 'pending',
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'info',
  PAYMENT_COMPLETED: 'active',
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
  return 'Unable to create claim right now.';
}

function isTerminalOcrStatus(status) {
  return status === 'COMPLETED' || status === 'FAILED';
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
  const { user } = useAuth();
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [extractedForm, setExtractedForm] = useState({ ...EMPTY_EXTRACTED_FORM });

  const activePolicies = policies.filter((policy) => policy.active);
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
    setWorkflowStep('create');
    setIsWorkflowModalOpen(true);
  };

  const closeWorkflowModal = (force = false) => {
    if (!force && (submitting || savingExtractedData)) return;
    setIsWorkflowModalOpen(false);
    setWorkflowStep('create');
    setActiveClaimId(null);
    setActiveClaimDetails(null);
    resetCreateForm();
  };

  const openClaimReview = async (claimId) => {
    setSuccessMessage('');
    setFormError('');
    setExtractionError('');
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

  const handleSaveExtractedData = async (event) => {
    event.preventDefault();
    if (!activeClaimId) {
      return;
    }

    setSavingExtractedData(true);
    setFormError('');
    setExtractionError('');

    try {
      await updateClaimExtractedData(activeClaimId, {
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

      await loadClaims();
      if (activeClaimId) {
        await loadClaimDetails(activeClaimId);
      }
      setSuccessMessage('Extracted claim data saved successfully.');
      closeWorkflowModal(true);
    } catch (error) {
      setExtractionError(extractErrorMessage(error));
    } finally {
      setSavingExtractedData(false);
    }
  };

  const activeOcrStatus = activeClaimDetails?.extractedData?.ocrStatus;
  const activeOcrFailureReason = activeClaimDetails?.extractedData?.ocrFailureReason;
  const workflowTitle = workflowStep === 'create'
    ? 'Create New Claim'
    : workflowStep === 'processing'
      ? 'OCR Extraction in Progress'
      : 'Review Extracted Data';

  return (
    <PageShell title="Claims Dashboard" eyebrow="Customer Claims">
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardCard eyebrow="Policy Holder" title={user?.fullName || 'Customer'}>
          <p className="text-sm text-slate-500">Create new claims against your purchased policies and upload the required PDFs.</p>
        </DashboardCard>
        <DashboardCard eyebrow="OCR Ready" title={String(readyClaims)}>
          <p className="text-sm text-slate-500">{submittedClaims} claims submitted overall</p>
        </DashboardCard>
        <DashboardCard eyebrow="OCR Queue" title={String(processingClaims)}>
          <p className="text-sm text-slate-500">{activePolicies.length} active policies can start new claims.</p>
        </DashboardCard>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">My Claims</h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload the required claim documents now. OCR and downstream workflow stages will be added later.
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

        {loading ? (
          <div className="mt-8 flex justify-center">
            <LoadingSpinner label="Loading claims" />
          </div>
        ) : claims.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h4 className="mt-3 text-base font-semibold text-ink-900">No claims yet</h4>
            <p className="mt-2 text-sm text-slate-500">
              Start a new claim by selecting one of your active policies and uploading the required documents.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {claims.map((claim) => (
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
                    <StatusBadge variant="info">{humanize(claim.stage)}</StatusBadge>
                    <StatusBadge variant={OCR_STATUS_VARIANTS[claim.ocrStatus] || 'info'}>
                      OCR {humanize(claim.ocrStatus || 'PENDING')}
                    </StatusBadge>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">Submitted</p>
                    <p className="mt-1 font-medium text-ink-900">{formatDateTime(claim.submissionDate)}</p>
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
                    Review Extracted Data
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
                Submit Claim
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
          <form className="space-y-6" onSubmit={handleSaveExtractedData}>
            {extractionError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {extractionError}
              </div>
            ) : null}

            {activeOcrStatus === 'FAILED' ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">OCR could not complete automatically.</p>
                    <p className="mt-1">{activeOcrFailureReason || 'You can still fill in or correct the extracted fields below.'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>OCR extraction completed. Review and correct any field before saving.</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={OCR_STATUS_VARIANTS[activeOcrStatus] || 'info'}>
                OCR {humanize(activeOcrStatus || 'PENDING')}
              </StatusBadge>
              {activeClaimDetails?.claim ? (
                <span className="text-sm text-slate-500">{activeClaimDetails.claim.claimNumber}</span>
              ) : null}
            </div>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Policy Details</h4>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Policy Number" value={extractedForm.policyNumber} onChange={(value) => handleExtractedFieldChange('policyNumber', value)} />
                <EditableField label="Policy Name" value={extractedForm.policyName} onChange={(value) => handleExtractedFieldChange('policyName', value)} />
                <EditableField label="Carrier Name" value={extractedForm.carrierName} onChange={(value) => handleExtractedFieldChange('carrierName', value)} />
                <EditableField label="Claim Type" value={extractedForm.claimType} onChange={(value) => handleExtractedFieldChange('claimType', value)} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Customer and Hospital</h4>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Customer Name" value={extractedForm.customerName} onChange={(value) => handleExtractedFieldChange('customerName', value)} />
                <EditableField label="Patient Name" value={extractedForm.patientName} onChange={(value) => handleExtractedFieldChange('patientName', value)} />
                <EditableField label="Hospital Name" value={extractedForm.hospitalName} onChange={(value) => handleExtractedFieldChange('hospitalName', value)} />
                <EditableField label="Admission Date" type="date" value={extractedForm.admissionDate} onChange={(value) => handleExtractedFieldChange('admissionDate', value)} />
                <EditableField label="Discharge Date" type="date" value={extractedForm.dischargeDate} onChange={(value) => handleExtractedFieldChange('dischargeDate', value)} />
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Billing and Diagnosis</h4>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditableField label="Claimed Amount" type="number" value={extractedForm.claimedAmount} onChange={(value) => handleExtractedFieldChange('claimedAmount', value)} />
                <EditableField label="Total Bill Amount" type="number" value={extractedForm.totalBillAmount} onChange={(value) => handleExtractedFieldChange('totalBillAmount', value)} />
                <EditableField label="Bill Number" value={extractedForm.billNumber} onChange={(value) => handleExtractedFieldChange('billNumber', value)} />
                <EditableField label="Bill Date" type="date" value={extractedForm.billDate} onChange={(value) => handleExtractedFieldChange('billDate', value)} />
              </div>
              <EditableField
                label="Diagnosis"
                type="textarea"
                value={extractedForm.diagnosis}
                onChange={(value) => handleExtractedFieldChange('diagnosis', value)}
              />
            </section>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeWorkflowModal}
                disabled={savingExtractedData}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={savingExtractedData}
                className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingExtractedData ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                Save Extracted Data
              </button>
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  );
}

function EditableField({ label, value, onChange, type = 'text' }) {
  const baseClasses = 'w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={baseClasses}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={baseClasses}
        />
      )}
    </label>
  );
}

export default CustomerClaimsPage;
