import axios from 'axios';
import { AUTH_STORAGE_KEY } from '../constants/appConstants.js';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/apiConfig.js';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedSession) {
    return config;
  }

  try {
    const session = JSON.parse(storedSession);
    if (session?.token) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return config;
});

export default apiClient;
