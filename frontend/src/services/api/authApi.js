import apiClient from '../apiClient.js';

export async function registerCustomer(payload) {
  const response = await apiClient.post('/auth/customer/register', payload);
  return response.data.data;
}

export async function loginCustomer(payload) {
  const response = await apiClient.post('/auth/customer/login', payload);
  return response.data.data;
}

export async function loginStaticRole(payload) {
  const response = await apiClient.post('/auth/static/login', payload);
  return response.data.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
}
