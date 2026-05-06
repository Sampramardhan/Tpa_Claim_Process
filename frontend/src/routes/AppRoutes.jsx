import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import CarrierPage from '../pages/CarrierPage.jsx';
import ClientPage from '../pages/ClientPage.jsx';
import CustomerPage from '../pages/CustomerPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import FmgPage from '../pages/FmgPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customer" element={<CustomerPage />} />
        <Route path="client" element={<ClientPage />} />
        <Route path="fmg" element={<FmgPage />} />
        <Route path="carrier" element={<CarrierPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
