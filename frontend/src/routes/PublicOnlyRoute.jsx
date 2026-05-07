import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getRoleHomePath } from '../utils/authUtils.js';

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitialized, user } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }

  return children;
}

export default PublicOnlyRoute;
