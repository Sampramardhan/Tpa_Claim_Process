import apiClient from '../apiClient.js';

export async function getMyClaims() {
  const response = await apiClient.get('/customer/claims');
  return response.data.data;
}

export async function getMyClaim(claimId) {
  const response = await apiClient.get(`/customer/claims/${claimId}`);
  return response.data.data;
}

export async function createClaim(payload, onProgress) {
  const formData = new FormData();
  formData.append('customerPolicyId', payload.customerPolicyId);
  formData.append('claimForm', payload.claimForm);
  formData.append('hospitalDocument', payload.hospitalDocument);

  const response = await apiClient.post('/customer/claims', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) {
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
    },
  });

  return response.data.data;
}

export async function updateClaimExtractedData(claimId, payload) {
  const response = await apiClient.put(`/customer/claims/${claimId}/extracted-data`, payload);
  return response.data.data;
}

export async function submitClaim(claimId) {
  const response = await apiClient.post(`/customer/claims/${claimId}/submit`);
  return response.data.data;
}

export async function getClientClaimsQueue() {
  const response = await apiClient.get('/client/claims');
  return response.data.data;
}

export async function getClientClaim(claimId) {
  const response = await apiClient.get(`/client/claims/${claimId}`);
  return response.data.data;
}

export async function validateClientClaim(claimId) {
  const response = await apiClient.post(`/client/claims/${claimId}/validate`);
  return response.data.data;
}

export async function approveClientClaim(claimId) {
  const response = await apiClient.post(`/client/claims/${claimId}/approve`);
  return response.data.data;
}

export async function rejectClientClaim(claimId, payload = {}) {
  const response = await apiClient.post(`/client/claims/${claimId}/reject`, payload);
  return response.data.data;
}

export async function getFmgClaimsQueue() {
  const response = await apiClient.get('/fmg/claims');
  return response.data.data;
}

export async function getFmgClaim(claimId) {
  const response = await apiClient.get(`/fmg/claims/${claimId}`);
  return response.data.data;
}

export async function evaluateFmgClaim(claimId) {
  const response = await apiClient.post(`/fmg/claims/${claimId}/evaluate`);
  return response.data.data;
}

export async function confirmFmgDecision(claimId, payload) {
  const response = await apiClient.post(`/fmg/claims/${claimId}/confirm`, payload);
  return response.data.data;
}

// ── FMG Manual Review ───────────────────────────────────────────────

export async function getFmgManualReviewQueue() {
  const response = await apiClient.get('/fmg/claims/manual-review');
  return response.data.data;
}

export async function getFmgManualReviewDetails(claimId) {
  const response = await apiClient.get(`/fmg/claims/${claimId}/manual-review`);
  return response.data.data;
}

export async function submitFmgManualReview(claimId, payload) {
  const response = await apiClient.post(`/fmg/claims/${claimId}/manual-review`, payload);
  return response.data.data;
}

// ── Carrier Review ──────────────────────────────────────────────────

export async function getCarrierClaimsQueue() {
  const response = await apiClient.get('/carrier/claims');
  return response.data.data;
}

export async function getCarrierClaim(claimId) {
  const response = await apiClient.get(`/carrier/claims/${claimId}`);
  return response.data.data;
}

export async function approveCarrierPayment(claimId, payload) {
  const response = await apiClient.post(`/carrier/claims/${claimId}/approve`, payload);
  return response.data.data;
}

export async function rejectCarrierClaim(claimId, payload) {
  const response = await apiClient.post(`/carrier/claims/${claimId}/reject`, payload);
  return response.data.data;
}


function buildDocumentViewUrl(pathPrefix, claimId, documentId, token) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const url = `${baseUrl}${pathPrefix}/${claimId}/documents/${documentId}/view`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function getDocumentViewUrl(claimId, documentId, token) {
  return buildDocumentViewUrl('/customer/claims', claimId, documentId, token);
}

export function getClientDocumentViewUrl(claimId, documentId, token) {
  return buildDocumentViewUrl('/client/claims', claimId, documentId, token);
}

export function getFmgDocumentViewUrl(claimId, documentId, token) {
  return buildDocumentViewUrl('/fmg/claims', claimId, documentId, token);
}

export function getCarrierDocumentViewUrl(claimId, documentId, token) {
  return buildDocumentViewUrl('/carrier/claims', claimId, documentId, token);
}
