import { ROLE_HOME_PATHS } from '../constants/appConstants.js';

export function getRoleHomePath(role) {
  return ROLE_HOME_PATHS[role] || '/dashboard';
}

export function isSessionExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}
