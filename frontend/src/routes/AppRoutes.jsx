import { Route, Routes } from 'react-router-dom';
import { USER_ROLES } from '../constants/appConstants.js';
import MainLayout from '../layouts/MainLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import CarrierPage from '../pages/CarrierPage.jsx';
import CarrierQueuePage from '../pages/CarrierQueuePage.jsx';
import CarrierClaimReviewPage from '../pages/CarrierClaimReviewPage.jsx';
import CarrierPoliciesPage from '../pages/CarrierPoliciesPage.jsx';
import CarrierHistoryPage from '../pages/CarrierHistoryPage.jsx';
import ClientPage from '../pages/ClientPage.jsx';
import ClientQueuePage from '../pages/ClientQueuePage.jsx';
import ClientPoliciesPage from '../pages/ClientPoliciesPage.jsx';
import ClientClaimReviewPage from '../pages/ClientClaimReviewPage.jsx';
import ClientVerificationPage from '../pages/ClientVerificationPage.jsx';
import CustomerClaimsPage from '../pages/CustomerClaimsPage.jsx';
import CustomerClaimReviewPage from '../pages/CustomerClaimReviewPage.jsx';
import CustomerPage from '../pages/CustomerPage.jsx';
import CustomerCatalogPage from '../pages/CustomerCatalogPage.jsx';
import CustomerPoliciesPage from '../pages/CustomerPoliciesPage.jsx';
import CustomerRegisterPage from '../pages/CustomerRegisterPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import FmgPage from '../pages/FmgPage.jsx';
import FmgStandardQueuePage from '../pages/FmgStandardQueuePage.jsx';
import FmgManualQueuePage from '../pages/FmgManualQueuePage.jsx';
import FmgEvaluatedHistoryPage from '../pages/FmgEvaluatedHistoryPage.jsx';
import FmgClaimReviewPage from '../pages/FmgClaimReviewPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
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
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
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

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CUSTOMER]} />}>
            <Route path="customer" element={<CustomerPage />} />
            <Route path="customer/claims" element={<CustomerClaimsPage />} />
            <Route path="customer/claims/:id" element={<CustomerClaimReviewPage />} />
            <Route path="customer/catalog" element={<CustomerCatalogPage />} />
            <Route path="customer/policies" element={<CustomerPoliciesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]} />}>
            <Route path="client" element={<ClientPage />} />
            <Route path="client/queue" element={<ClientQueuePage />} />
            <Route path="client/claims/:id" element={<ClientClaimReviewPage />} />
            <Route path="client/policies" element={<ClientPoliciesPage />} />
            <Route path="client/verify" element={<ClientVerificationPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.FMG]} />}>
            <Route path="fmg" element={<FmgPage />} />
            <Route path="fmg/queue" element={<FmgStandardQueuePage />} />
            <Route path="fmg/manual" element={<FmgManualQueuePage />} />
            <Route path="fmg/history" element={<FmgEvaluatedHistoryPage />} />
            <Route path="fmg/claims/:id" element={<FmgClaimReviewPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[USER_ROLES.CARRIER]} />}>
            <Route path="carrier" element={<CarrierPage />} />
            <Route path="carrier/queue" element={<CarrierQueuePage />} />
            <Route path="carrier/claims/:id" element={<CarrierClaimReviewPage />} />
            <Route path="carrier/policies" element={<CarrierPoliciesPage />} />
            <Route path="carrier/history" element={<CarrierHistoryPage />} />
          </Route>
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
