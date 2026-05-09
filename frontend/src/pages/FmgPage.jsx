import { useEffect, useState } from 'react';
import { ClipboardEdit, FileSearch, RefreshCw } from 'lucide-react';
import DocumentViewer from '../components/claims/DocumentViewer.jsx';
import ReviewField from '../components/claims/ReviewField.jsx';
import FmgDecisionActionPanel from '../components/fmg/FmgDecisionActionPanel.jsx';
import FmgManualReviewPanel from '../components/fmg/FmgManualReviewPanel.jsx';
import FmgRuleEvaluationPanel from '../components/fmg/FmgRuleEvaluationPanel.jsx';
import TimelineShell from '../components/timeline/TimelineShell.jsx';
import DashboardCard from '../components/ui/DashboardCard.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import Modal from '../components/ui/Modal.jsx';
import PageShell from '../components/ui/PageShell.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  confirmFmgDecision,
  evaluateFmgClaim,
  getFmgClaim,
  getFmgClaimsQueue,
  getFmgHistoryQueue,
  getFmgDocumentViewUrl,
  getFmgManualReviewQueue,
  getFmgManualReviewDetails,
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

const OCR_STATUS_VARIANTS = {
  PENDING: 'pending',
  PROCESSING: 'pending',
  COMPLETED: 'active',
  FAILED: 'expired',
};

const STAGE_VARIANTS = {
  FMG_REVIEW: 'pending',
  FMG_MANUAL_REVIEW: 'pending',
  CARRIER_REVIEW: 'active',
  COMPLETED: 'expired',
};

const DECISION_VARIANTS = {
  APPROVED: 'active',
  REJECTED: 'expired',
  MANUAL_REVIEW: 'pending',
};

function formatDateTime(value) {
  if (!value) {
    return 'Pending';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return 'Not available';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
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

function FmgPage() {
  const { user, token } = useAuth();
  const [claimQueue, setClaimQueue] = useState([]);
  const [manualQueue, setManualQueue] = useState([]);
  const [historyQueue, setHistoryQueue] = useState([]);
  const [queueDecisionState, setQueueDecisionState] = useState({});
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState('');
  const [activeTab, setActiveTab] = useState('standard');

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [activeClaimDetails, setActiveClaimDetails] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadQueues();
  }, []);

  async function loadQueues() {
    setQueueLoading(true);
    setQueueError('');

    try {
      const [queue, manual, history] = await Promise.all([
        getFmgClaimsQueue(),
        getFmgManualReviewQueue(),
        getFmgHistoryQueue()
      ]);
      
      setClaimQueue(queue || []);
      setManualQueue(manual || []);
      setHistoryQueue(history || []);
      await hydrateQueueDecisions([...(queue || []), ...(manual || [])]);
    } catch (error) {
      setClaimQueue([]);
      setManualQueue([]);
      setHistoryQueue([]);
      setQueueDecisionState({});
      setQueueError(extractErrorMessage(error, 'Unable to load the FMG review queues.'));
    } finally {
      setQueueLoading(false);
    }
  }

  async function hydrateQueueDecisions(queue) {
    if (!queue.length) {
      setQueueDecisionState({});
      return;
    }

    setQueueDecisionState(
      Object.fromEntries(queue.map((claim) => [claim.id, { loading: true, decision: null }]))
    );

    const results = await Promise.allSettled(queue.map((claim) => getFmgClaim(claim.id)));

    const nextState = {};
    results.forEach((result, index) => {
      const claimId = queue[index].id;
      nextState[claimId] = {
        loading: false,
        decision: result.status === 'fulfilled' ? result.value?.fmgDecision || null : null,
      };
    });

    setQueueDecisionState(nextState);
  }

  function syncQueueDecision(claimId, decision) {
    if (!claimId) {
      return;
    }

    setQueueDecisionState((current) => ({
      ...current,
      [claimId]: {
        loading: false,
        decision: decision || null,
      },
    }));
  }

  async function loadClaimDetails(claimId, isManual = false) {
    setReviewLoading(true);
    setReviewError('');

    try {
      const data = isManual 
        ? await getFmgManualReviewDetails(claimId)
        : await getFmgClaim(claimId);
        
      setActiveClaimDetails(data);
      syncQueueDecision(claimId, data?.fmgDecision);
      return data;
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to load FMG claim review details.'));
      throw error;
    } finally {
      setReviewLoading(false);
    }
  }

  async function openClaimReview(claimId, isManual = false) {
    setActiveClaimId(claimId);
    setActiveClaimDetails(null);
    setReviewError('');
    setReviewSuccess('');
    setIsReviewOpen(true);

    try {
      await loadClaimDetails(claimId, isManual);
    } catch {
      // Error state is already handled in loadClaimDetails.
    }
  }

  function closeClaimReview() {
    if (actionLoading) {
      return;
    }

    setIsReviewOpen(false);
    setActiveClaimId(null);
    setActiveClaimDetails(null);
    setReviewError('');
    setReviewSuccess('');
  }

  async function handleEvaluateClaim() {
    if (!activeClaimId) {
      return;
    }

    setActionLoading('evaluate');
    setReviewError('');
    setReviewSuccess('');

    try {
      const data = await evaluateFmgClaim(activeClaimId);
      setActiveClaimDetails(data);
      syncQueueDecision(activeClaimId, data?.fmgDecision);
      setReviewSuccess('FMG evaluation completed. Review the triggered rules, then confirm the final decision.');
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to run FMG evaluation right now.'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleConfirmDecision(decision) {
    if (!activeClaimId) {
      return;
    }

    setActionLoading(decision);
    setReviewError('');
    setReviewSuccess('');

    try {
      const data = await confirmFmgDecision(activeClaimId, { decision });
      setActiveClaimDetails(data);
      syncQueueDecision(activeClaimId, data?.fmgDecision);
      setReviewSuccess(`FMG confirmed ${humanize(decision)} successfully.`);
      await loadQueues();
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to confirm the FMG decision.'));
    } finally {
      setActionLoading('');
    }
  }

  async function handleSubmitManualReview(decision, reviewerNotes) {
    if (!activeClaimId) {
      return;
    }

    setActionLoading(decision);
    setReviewError('');
    setReviewSuccess('');

    try {
      const data = await submitFmgManualReview(activeClaimId, { decision, reviewerNotes });
      setActiveClaimDetails(data);
      setReviewSuccess(`FMG manual review ${humanize(decision)} submitted successfully.`);
      await loadQueues();
    } catch (error) {
      setReviewError(extractErrorMessage(error, 'Unable to submit the FMG manual review.'));
    } finally {
      setActionLoading('');
    }
  }

  const evaluatedCount = claimQueue.filter((claim) => queueDecisionState[claim.id]?.decision?.recommendedDecision).length;
  const awaitingConfirmationCount = claimQueue.filter(
    (claim) =>
      queueDecisionState[claim.id]?.decision?.recommendedDecision &&
      !queueDecisionState[claim.id]?.decision?.confirmed
  ).length;

  const activeClaim = activeClaimDetails?.claim;
  const activeDecision = activeClaimDetails?.fmgDecision;
  const activeManualReview = activeClaimDetails?.manualReview;
  
  const isManualReviewMode = activeClaim?.stage === 'FMG_MANUAL_REVIEW';
  const canEvaluateClaim = activeClaim?.status === 'UNDER_REVIEW' && activeClaim?.stage === 'FMG_REVIEW';
  
  const claimFormDocument = activeClaimDetails?.documents?.find((document) => document.documentType === 'CLAIM_FORM');
  const hospitalDocument = activeClaimDetails?.documents?.find(
    (document) => document.documentType === 'HOSPITAL_DOCUMENT'
  );

  const columns = [
    {
      key: 'claimNumber',
      label: 'Claim No.',
      render: (claim) => <span className="font-mono text-xs">{claim.claimNumber}</span>,
    },
    { key: 'customerName', label: 'Customer' },
    {
      key: 'customerPolicyNumber',
      label: 'Policy No.',
      render: (claim) => <span className="font-mono text-xs">{claim.customerPolicyNumber}</span>,
    },
    {
      key: 'status',
      label: 'Current Status',
      render: (claim) => (
        <div className="flex items-center gap-2">
          <StatusBadge variant={CLAIM_STATUS_VARIANTS[claim.status] || 'info'}>{humanize(claim.status)}</StatusBadge>
          <StatusBadge variant={STAGE_VARIANTS[claim.stage] || 'info'}>{humanize(claim.stage)}</StatusBadge>
        </div>
      ),
    },
    {
      key: 'evaluation',
      label: 'Evaluation Result',
      render: (claim) => {
        const decisionState = queueDecisionState[claim.id];

        if (!decisionState || decisionState.loading) {
          return (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Checking
            </span>
          );
        }

        if (!decisionState.decision?.recommendedDecision) {
          return <StatusBadge variant="info">Not Evaluated</StatusBadge>;
        }

        return (
          <div className="flex items-center gap-2">
            <StatusBadge variant={DECISION_VARIANTS[decisionState.decision.recommendedDecision] || 'info'}>
              {humanize(decisionState.decision.recommendedDecision)}
            </StatusBadge>
            {decisionState.decision.confirmed ? <StatusBadge variant="active">Confirmed</StatusBadge> : null}
          </div>
        );
      },
    },
    {
      key: 'submissionDate',
      label: 'Submitted',
      render: (claim) => formatDateTime(claim.submissionDate),
    },
  ];

  return (
    <PageShell title="FMG Dashboard" eyebrow="FMG Review Portal">
      <div className="grid gap-4 lg:grid-cols-4">
        <DashboardCard eyebrow="Signed In As" title={user?.fullName}>
          <p className="text-sm text-slate-500">Final medical governance review</p>
        </DashboardCard>
        <DashboardCard eyebrow="Standard Queue" title={String(claimQueue.length)}>
          <p className="text-sm text-slate-500">Claims waiting for rule evaluation</p>
        </DashboardCard>
        <DashboardCard eyebrow="Manual Queue" title={String(manualQueue.length)}>
          <p className="text-sm text-slate-500">Claims flagged for FMG override</p>
        </DashboardCard>
        <DashboardCard eyebrow="Evaluated" title={String(evaluatedCount)}>
          <p className="text-sm text-slate-500">{awaitingConfirmationCount} still awaiting confirmation</p>
        </DashboardCard>
      </div>

      <div className="grid gap-8">
        <div className="flex gap-1 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'standard' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Standard Queue
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'manual' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Manual Queue {manualQueue.length > 0 ? `(${manualQueue.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'history' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Processed History
          </button>
        </div>

        {activeTab === 'manual' && (
          <section className="rounded-md border-2 border-indigo-100 bg-white p-6 shadow-md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <ClipboardEdit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink-900">Manual Review Queue</h3>
                  <p className="text-sm text-slate-500">
                    High-priority claims flagged for expert manual intervention and override.
                  </p>
                </div>
              </div>
              <StatusBadge variant="pending">{manualQueue.length} Flagged</StatusBadge>
            </div>

            <DataTable
              columns={columns}
              data={manualQueue}
              emptyMessage="No claims are currently flagged for manual review."
              onRowClick={(claim) => openClaimReview(claim.id, true)}
            />
          </section>
        )}

        {activeTab === 'standard' && (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">FMG Claim Queue</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Open a claim to inspect OCR output, compare source documents, review triggered rules, and confirm the final FMG decision.
                </p>
              </div>
              <button
                type="button"
                onClick={loadQueues}
                disabled={queueLoading}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {queueLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Queues
              </button>
            </div>

            {queueError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {queueError}
              </div>
            ) : null}

            {queueLoading ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={claimQueue}
                emptyMessage="No claims are currently waiting for FMG review."
                onRowClick={(claim) => openClaimReview(claim.id, false)}
              />
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">FMG Processed History</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Historical view of claims that have been processed by FMG.
                </p>
              </div>
              <button
                type="button"
                onClick={loadQueues}
                disabled={queueLoading}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {queueLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Queues
              </button>
            </div>

            {queueLoading ? (
              <div className="flex h-32 items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={historyQueue}
                emptyMessage="No processed historical claims found."
                onRowClick={(claim) => openClaimReview(claim.id, false)}
              />
            )}
          </section>
        )}
      </div>

      <Modal
        open={isReviewOpen}
        onClose={closeClaimReview}
        title={activeClaim?.claimNumber ? `FMG Review - ${activeClaim.claimNumber}` : 'FMG Claim Review'}
        wide
      >
        {reviewLoading ? (
          <div className="flex h-full items-center justify-center bg-slate-50">
            <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
          </div>
        ) : reviewError && !activeClaimDetails ? (
          <div className="flex h-full items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center text-sm text-red-700">
              {reviewError}
            </div>
          </div>
        ) : activeClaimDetails ? (
          <div className="flex h-full flex-col bg-slate-100/50">
            <div className="border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{activeClaim.customerName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeClaim.policyName} | {activeClaim.carrierName}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Submitted {formatDateTime(activeClaim.submissionDate)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant={CLAIM_STATUS_VARIANTS[activeClaim.status] || 'info'}>
                    {humanize(activeClaim.status)}
                  </StatusBadge>
                  <StatusBadge variant={STAGE_VARIANTS[activeClaim.stage] || 'info'}>
                    {humanize(activeClaim.stage)}
                  </StatusBadge>
                  <StatusBadge variant={OCR_STATUS_VARIANTS[activeClaim.ocrStatus] || 'info'}>
                    {humanize(activeClaim.ocrStatus || 'PENDING')}
                  </StatusBadge>
                  {activeDecision?.recommendedDecision ? (
                    <StatusBadge variant={DECISION_VARIANTS[activeDecision.recommendedDecision] || 'info'}>
                      {humanize(activeDecision.recommendedDecision)}
                    </StatusBadge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[1.15fr,0.85fr]">
              <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Document Preview</h4>
                    <p className="text-sm font-bold text-slate-800">Side-by-Side Source Review</p>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 overflow-auto bg-slate-100 p-4 xl:grid-cols-2">
                  <DocumentPanel
                    document={claimFormDocument}
                    title="Claim Form"
                    url={
                      claimFormDocument
                        ? getFmgDocumentViewUrl(activeClaimId, claimFormDocument.id, token)
                        : null
                    }
                  />
                  <DocumentPanel
                    document={hospitalDocument}
                    title="Hospital Document"
                    url={
                      hospitalDocument
                        ? getFmgDocumentViewUrl(activeClaimId, hospitalDocument.id, token)
                        : null
                    }
                  />
                </div>
              </section>

              <section className="min-h-0 space-y-6 overflow-y-auto pr-1">
                {reviewError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {reviewError}
                  </div>
                ) : null}

                {reviewSuccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {reviewSuccess}
                  </div>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    <ReviewField
                      label="Client Validation"
                      value={
                        activeClaimDetails.clientValidation
                          ? `${humanize(activeClaimDetails.clientValidation.validationStatus)} / ${humanize(activeClaimDetails.clientValidation.reviewDecision)}`
                          : 'Not available'
                      }
                    />
                  </div>
                </section>

                {isManualReviewMode ? (
                  <FmgManualReviewPanel
                    manualReview={activeManualReview}
                    fmgDecision={activeDecision}
                    actionLoading={actionLoading}
                    onSubmit={handleSubmitManualReview}
                  />
                ) : activeClaim?.stage === 'FMG_REVIEW' ? (
                  <>
                    <FmgRuleEvaluationPanel
                      decision={activeDecision}
                      evaluating={actionLoading === 'evaluate'}
                      disabled={!canEvaluateClaim || Boolean(actionLoading && actionLoading !== 'evaluate')}
                      onEvaluate={handleEvaluateClaim}
                    />

                    <FmgDecisionActionPanel
                      decision={activeDecision}
                      actionLoading={actionLoading}
                      onConfirm={handleConfirmDecision}
                    />
                  </>
                ) : (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                    <p className="text-sm font-semibold text-blue-800">FMG Review Completed</p>
                    <p className="mt-1 text-sm text-blue-600">
                      This claim has already been processed by FMG and is now in the {humanize(activeClaim?.stage)} stage.
                    </p>
                  </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    <ReviewField
                      label="Claimed Amount"
                      value={formatCurrency(activeClaimDetails.extractedData?.claimedAmount)}
                    />
                    <ReviewField
                      label="Total Bill Amount"
                      value={formatCurrency(activeClaimDetails.extractedData?.totalBillAmount)}
                    />
                  </div>
                  <div className="mt-3">
                    <ReviewField label="Diagnosis" value={activeClaimDetails.extractedData?.diagnosis} multiline />
                  </div>
                </section>

                <TimelineShell entries={activeClaimDetails.timeline || []} />
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeClaimReview}
                  disabled={Boolean(actionLoading)}
                  className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}

function DocumentPanel({ title, document, url }) {
  return (
    <section className="flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {document?.originalFileName || 'Document not uploaded'}
            </p>
          </div>
          {document ? <StatusBadge variant="info">{humanize(document.documentType)}</StatusBadge> : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-800">
        {url ? (
          <DocumentViewer url={url} title={`${title} Preview`} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
            <FileSearch className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No document available for preview.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default FmgPage;
