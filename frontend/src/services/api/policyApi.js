import apiClient from '../apiClient.js';

// ── Carrier Endpoints ─────────────────────────────────────────

export async function createPolicy(payload) {
  const response = await apiClient.post('/carrier/policies', payload);
  return response.data.data;
}

export async function getCarrierPolicies() {
  const response = await apiClient.get('/carrier/policies');
  return response.data.data;
}

export async function togglePolicyActive(policyId) {
  const response = await apiClient.patch(`/carrier/policies/${policyId}/toggle-active`);
  return response.data.data;
}

// ── Customer Endpoints ────────────────────────────────────────

export async function getPolicyCatalog() {
  const response = await apiClient.get('/customer/policies/catalog');
  return response.data.data;
}

export async function purchasePolicy(policyId) {
  const response = await apiClient.post('/customer/policies/purchase', { policyId });
  return response.data.data;
}

export async function getMyPolicies() {
  const response = await apiClient.get('/customer/policies');
  return response.data.data;
}

// ── Client Endpoints ──────────────────────────────────────────

export async function verifyPolicy(policyNumber) {
  const response = await apiClient.get(`/client/policies/verify/${encodeURIComponent(policyNumber)}`);
  return response.data.data;
}

export async function searchPolicies(query) {
  const response = await apiClient.get('/client/policies/search', { params: { q: query } });
  return response.data.data;
}

export async function getAllCustomerPolicies() {
  const response = await apiClient.get('/client/policies');
  return response.data.data;
}
