import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { getRoleHomePath } from '../utils/authUtils.js';

/**
 * DashboardPage - Redirects users to their role-specific operational home.
 * This replaces the previous static placeholder dashboard template.
 */
function DashboardPage() {
  const { user, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && user?.role) {
      const homePath = getRoleHomePath(user.role);
      navigate(homePath, { replace: true });
    }
  }, [isInitialized, user, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium text-slate-500 text-center">
          Loading your operational workspace...
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;

