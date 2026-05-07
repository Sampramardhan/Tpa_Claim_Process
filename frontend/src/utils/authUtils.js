import { ROLE_HOME_PATHS } from '../constants/appConstants.js';

export function getRoleHomePath(role) {
  return ROLE_HOME_PATHS[role] || '/dashboard';
}

export function isSessionExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  // Handle case where expiresAt might be a LocalDateTime string without timezone
  // If it doesn't contain 'Z' or '+' or '-', we assume it's UTC for JWT consistency
  const dateStr = (typeof expiresAt === 'string' && !expiresAt.includes('Z') && !expiresAt.includes('+'))
    ? `${expiresAt}Z`
    : expiresAt;

  const expiryTime = new Date(dateStr).getTime();
  if (isNaN(expiryTime)) {
    return false; // If invalid date, don't assume expired
  }

  return expiryTime <= Date.now();
}

export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}
