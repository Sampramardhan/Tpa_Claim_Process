import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { AUTH_STORAGE_KEY } from '../constants/appConstants.js';
import {
  loginCustomer as loginCustomerRequest,
  loginStaticRole as loginStaticRoleRequest,
  registerCustomer as registerCustomerRequest,
  changePassword as changePasswordRequest,
  logoutUser as logoutUserRequest,
} from '../services/api/authApi.js';
import { isSessionExpired } from '../utils/authUtils.js';

export const AuthContext = createContext(null);

function readStoredSession() {
  const storedSession = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession);
    return session?.token && !isSessionExpired(session.expiresAt) ? session : null;
  } catch {
    return null;
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Set initialized to true after the first render
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    // Don't modify storage until we've finished initialization
    if (!isInitialized) {
      return;
    }
    if (!session) {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const saveAuthResponse = useCallback((authResponse) => {
    const nextSession = {
      token: authResponse.token,
      tokenType: authResponse.tokenType,
      expiresAt: authResponse.expiresAt,
      user: authResponse.user,
    };
    setSession(nextSession);
    return nextSession;
  }, []);

  const registerCustomer = useCallback(
    async (payload) => saveAuthResponse(await registerCustomerRequest(payload)),
    [saveAuthResponse],
  );

  const loginCustomer = useCallback(
    async (payload) => saveAuthResponse(await loginCustomerRequest(payload)),
    [saveAuthResponse],
  );

  const loginStaticRole = useCallback(
    async (payload) => saveAuthResponse(await loginStaticRoleRequest(payload)),
    [saveAuthResponse],
  );

  const changePassword = useCallback(async (payload) => {
    return await changePasswordRequest(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (session?.token) {
        await logoutUserRequest();
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      setSession(null);
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      isInitialized,
      token: session?.token || null,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.token && session?.user),
      registerCustomer,
      loginCustomer,
      loginStaticRole,
      changePassword,
      logout,
    }),
    [loginCustomer, loginStaticRole, logout, registerCustomer, changePassword, session, isInitialized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
