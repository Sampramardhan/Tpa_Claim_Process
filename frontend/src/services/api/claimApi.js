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

export function getDocumentViewUrl(claimId, documentId, token) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  const url = `${baseUrl}/customer/claims/${claimId}/documents/${documentId}/view`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}
