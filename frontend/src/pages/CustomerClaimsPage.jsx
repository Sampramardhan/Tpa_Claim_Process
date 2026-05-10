import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSearch, FileText, Plus, RefreshCw, ScanSearch, Upload } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
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



function CustomerClaimsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const activeClaimsList = claims.filter(c => c.status !== 'PAID' && c.status !== 'REJECTED');
  const historyClaimsList = claims.filter(c => c.status === 'PAID' || c.status === 'REJECTED');
  const displayClaims = activeTab === 'active' ? activeClaimsList : historyClaimsList;

  const activePolicies = policies.filter((policy) => policy.active);
  const draftClaims = claims.filter((claim) => claim.status === 'DRAFT').length;
  const submittedClaims = claims.filter((claim) => claim.status === 'SUBMITTED').length;
  const readyClaims = claims.filter((claim) => claim.ocrStatus === 'COMPLETED').length;
  const processingClaims = claims.filter((claim) => claim.ocrStatus === 'PENDING' || claim.ocrStatus === 'PROCESSING').length;

  // Analytics Data
  const claimStatusData = useMemo(() => {
    const counts = claims.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: humanize(name), value }));
  }, [claims]);
  
  const claimStageData = useMemo(() => {
    const counts = claims.reduce((acc, c) => {
      acc[c.stage] = (acc[c.stage] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, count]) => ({ name: humanize(name), count }));
  }, [claims]);

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

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

    if (data?.extractedData && isTerminalOcrStatus(data.extractedData.ocrStatus)) {
      setIsWorkflowModalOpen(false);
      navigate(`/customer/claims/${claimId}`);
    } else {
      setWorkflowStep('processing');
    }

    return data;
  }, [navigate]);

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
    if (!force && submitting) return;
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
    
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;
    
    if (claim.status === 'DRAFT' && !isTerminalOcrStatus(claim.ocrStatus)) {
      setActiveClaimId(claimId);
      setActiveClaimDetails(null);
      setWorkflowStep('processing');
      setIsWorkflowModalOpen(true);

      try {
        const data = await loadClaimDetails(claimId);
        if (!data?.extractedData) {
          setExtractionError('No OCR extraction record is available for this claim yet.');
        }
      } catch (error) {
        setExtractionError(extractErrorMessage(error));
      }
    } else {
      navigate(`/customer/claims/${claimId}`);
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
      <div className="grid gap-6 lg:grid-cols-3">
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

      {claims.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Claims by Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={claimStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {claimStatusData.map((entry, index) => (
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
            <h3 className="text-lg font-semibold text-ink-900 mb-4">Claims in Progress (Stage)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={claimStageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="count">
                    {claimStageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
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
        ) : null}
      </Modal>
    </PageShell>
  );
}

export default CustomerClaimsPage;
