import { Route, Routes } from 'react-router-dom';
import { USER_ROLES } from '../constants/appConstants.js';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLandingPage from '../pages/AuthLandingPage.jsx';
import CarrierPage from '../pages/CarrierPage.jsx';
import ClientPage from '../pages/ClientPage.jsx';
import CustomerLoginPage from '../pages/CustomerLoginPage.jsx';
import CustomerClaimsPage from '../pages/CustomerClaimsPage.jsx';
import CustomerPage from '../pages/CustomerPage.jsx';
import CustomerRegisterPage from '../pages/CustomerRegisterPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import FmgPage from '../pages/FmgPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import RoleLoginPage from '../pages/RoleLoginPage.jsx';
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <PublicOnlyRoute>
            <AuthLandingPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="login/customer"
        element={
          <PublicOnlyRoute>
            <CustomerLoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="register/customer"
        element={
          <PublicOnlyRoute>
            <CustomerRegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="login/:roleName"
        element={
          <PublicOnlyRoute>
            <RoleLoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CUSTOMER]} />}>
            <Route path="customer" element={<CustomerPage />} />
            <Route path="customer/claims" element={<CustomerClaimsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]} />}>
            <Route path="client" element={<ClientPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FMG]} />}>
            <Route path="fmg" element={<FmgPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CARRIER]} />}>
            <Route path="carrier" element={<CarrierPage />} />
          </Route>
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
