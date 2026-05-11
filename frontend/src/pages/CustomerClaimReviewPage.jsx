import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSearch, ArrowLeft, Download } from 'lucide-react';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getDocumentViewUrl, getMyClaim, submitClaim, updateClaimExtractedData, getClaimReportUrl } from '../services/api/claimApi.js';

const OCR_STATUS_VARIANTS = { PENDING: 'pending', PROCESSING: 'pending', COMPLETED: 'active', FAILED: 'expired' };

const EMPTY_EXTRACTED_FORM = {
  policyNumber: '', customerName: '', patientName: '', carrierName: '', policyName: '', hospitalName: '',
  admissionDate: '', dischargeDate: '', claimedAmount: '', claimType: '', diagnosis: '', billNumber: '',
  billDate: '', totalBillAmount: '',
};

function humanize(value) {
  return value?.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function formatDateTime(value) {
  if (!value) return 'Pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function extractErrorMessage(error) {
  return error?.response?.data?.message || 'Unable to complete this claim action right now.';
}

function isTerminalOcrStatus(status) {
  return status === 'COMPLETED' || status === 'FAILED';
}

function isDraftClaim(claim) {
  return claim?.status === 'DRAFT' && claim?.stage === 'DRAFT';
}

function buildEditableForm(extractedData) {
  if (!extractedData) return { ...EMPTY_EXTRACTED_FORM };
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

function CustomerClaimReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [extractedForm, setExtractedForm] = useState({ ...EMPTY_EXTRACTED_FORM });
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const [extractionError, setExtractionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [savingExtractedData, setSavingExtractedData] = useState(false);
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitConfirmationError, setSubmitConfirmationError] = useState('');

  const loadClaimDetails = useCallback(async () => {
    setLoading(true);
    setExtractionError('');
    try {
      const data = await getMyClaim(id);
      setActiveClaimDetails(data);

      if (data?.extractedData) {
        setExtractedForm(buildEditableForm(data.extractedData));
      } else {
        setExtractedForm({ ...EMPTY_EXTRACTED_FORM });
      }

      if (data?.documents?.length > 0) {
        setSelectedDocumentId(data.documents[0].id);
      } else {
        setSelectedDocumentId(null);
      }
    } catch (error) {
      setExtractionError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClaimDetails();
  }, [loadClaimDetails]);

  const handleExtractedFieldChange = (field, value) => {
    setExtractedForm((current) => ({ ...current, [field]: value }));
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
    if (!id || !isDraftClaim(activeClaimDetails?.claim)) return;

    setSavingExtractedData(true);
    setExtractionError('');
    setSubmitConfirmationError('');
    setSuccessMessage('');

    try {
      await updateClaimExtractedData(id, buildExtractedDataPayload());
      setSuccessMessage('Draft claim data saved successfully.');
      await loadClaimDetails();
    } catch (error) {
      setExtractionError(extractErrorMessage(error));
    } finally {
      setSavingExtractedData(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!id || !isDraftClaim(activeClaimDetails?.claim)) return;

    setFinalSubmitting(true);
    setExtractionError('');
    setSubmitConfirmationError('');
    setSuccessMessage('');

    try {
      await updateClaimExtractedData(id, buildExtractedDataPayload());
      const submittedClaim = await submitClaim(id);
      setSuccessMessage(`Claim ${submittedClaim.claimNumber} submitted successfully.`);
      setIsSubmitConfirmOpen(false);
      await loadClaimDetails();
    } catch (error) {
      const message = extractErrorMessage(error);
      setExtractionError(message);
      setSubmitConfirmationError(message);
    } finally {
      setFinalSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Claim Details" eyebrow="Customer Claims">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner label="Loading claim details..." />
        </div>
      </PageShell>
    );
  }

  if (!activeClaimDetails) {
    return (
      <PageShell title="Claim Not Found" eyebrow="Customer Claims">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p>Could not load the requested claim. It may not exist or you do not have permission to view it.</p>
          <button onClick={() => navigate('/customer/claims')} className="mt-4 text-sm font-semibold text-red-800 underline">Return to Claims</button>
        </div>
      </PageShell>
    );
  }

  const activeClaim = activeClaimDetails.claim;
  const activeOcrStatus = activeClaimDetails.extractedData?.ocrStatus;
  const activeClaimIsDraft = isDraftClaim(activeClaim);
  const activeClaimLocked = !activeClaimIsDraft;
  const hasActiveExtractedData = Boolean(activeClaimDetails.extractedData);
  const canSaveDraft = activeClaimIsDraft && hasActiveExtractedData;
  const canFinalSubmit = canSaveDraft && isTerminalOcrStatus(activeOcrStatus);

  return (
    <PageShell title={activeClaimLocked ? 'Submitted Claim Details' : 'Review Draft Claim'} eyebrow="Customer Claims">
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <button
          onClick={() => navigate('/customer/claims')}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Claims
        </button>

        {activeClaimLocked && ['APPROVED', 'REJECTED', 'PAID'].includes(activeClaim.status) && (
          <a
            href={getClaimReportUrl(id, token)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            <Download className="h-4 w-4" /> Download Claim Report
          </a>
        )}
      </div>

      <TimelineShell entries={activeClaimDetails.timeline || []} />

      <div className="flex h-[calc(100vh-8rem)] min-h-[850px] gap-6 animate-fade-in-up">
        {/* Screen 1: Document View Panel */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:w-[60%]">
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Document Source</h4>
                <p className="text-sm font-bold text-slate-800">Original Uploaded File</p>
              </div>
              {activeClaimDetails.documents?.length > 0 && (
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
                url={getDocumentViewUrl(id, selectedDocumentId, token)}
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
              {extractionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {extractionError}
                </div>
              )}
              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {successMessage}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm interactive-card transition-all duration-300">
                <div className="flex flex-wrap gap-2 mb-3">
                  <StatusBadge variant="info">{humanize(activeClaim.status)}</StatusBadge>
                </div>
                <h4 className="text-sm font-bold text-ink-900">{activeClaim.claimNumber || 'Draft Claim'}</h4>
                <p className="mt-1 text-sm text-brand-600 font-medium">{activeClaim.policyName}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {activeClaim.submissionDate ? `Submitted on ${formatDateTime(activeClaim.submissionDate)}` : `Created on ${formatDateTime(activeClaim.createdAt)}`}
                </p>
              </div>

              {!activeClaimLocked ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-sm">
                  <p>
                    Review the extracted fields, save the draft if needed, then use <strong>Final Submit Claim</strong> when you're ready to lock it.
                  </p>
                </div>
              ) : null}

              {activeClaimLocked ? (
                <div className="grid gap-6">
                  {Object.entries(extractedForm).map(([field, value]) => (
                    <div key={field}>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        {humanize(field)}
                      </span>
                      <p className="text-sm font-medium text-ink-900 bg-slate-50 border border-slate-200 rounded-md p-3">
                        {value || <span className="text-slate-400 italic">Not extracted</span>}
                      </p>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-slate-200">
                  </div>
                </div>
              ) : (
                <div className="grid gap-6">
                  {Object.entries(extractedForm).map(([field, value]) => {
                    const isMultiline = field === 'diagnosis';
                    const isDate = field === 'admissionDate' || field === 'dischargeDate' || field === 'billDate';
                    const isNumber = field === 'claimedAmount' || field === 'totalBillAmount';
                    
                    return (
                      <div key={field}>
                        <label htmlFor={field} className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {humanize(field)}
                        </label>
                        {isMultiline ? (
                          <textarea
                            id={field}
                            value={value}
                            onChange={(e) => handleExtractedFieldChange(field, e.target.value)}
                            disabled={savingExtractedData || finalSubmitting}
                            rows={3}
                            className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-medium text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                          />
                        ) : (
                          <input
                            id={field}
                            type={isNumber ? 'number' : isDate ? 'date' : 'text'}
                            value={value}
                            onChange={(e) => handleExtractedFieldChange(field, e.target.value)}
                            disabled={savingExtractedData || finalSubmitting}
                            className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-medium text-ink-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </form>
          </div>
          
          {!activeClaimLocked && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveExtractedData}
                  disabled={!canSaveDraft || savingExtractedData || finalSubmitting}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingExtractedData ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubmitConfirmOpen(true)}
                  disabled={!canFinalSubmit || savingExtractedData || finalSubmitting}
                  className="rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Final Submit Claim
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal open={isSubmitConfirmOpen} onClose={() => setIsSubmitConfirmOpen(false)} title="Confirm Final Submission">
        <div className="p-2">
          {submitConfirmationError ? (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {submitConfirmationError}
            </div>
          ) : null}
          <div className="flex items-start gap-3 rounded-md bg-amber-50 p-4 text-amber-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Are you absolutely sure?</p>
              <p className="mt-1 text-sm opacity-90">
                Submitting this claim will lock it for review. You will not be able to edit the extracted data or upload different documents once submitted.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSubmitConfirmOpen(false)}
              disabled={finalSubmitting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={finalSubmitting}
              className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finalSubmitting ? 'Submitting...' : 'Yes, Submit Claim'}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

export default CustomerClaimReviewPage;
