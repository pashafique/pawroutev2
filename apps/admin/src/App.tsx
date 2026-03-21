import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import SlotsPage from './pages/SlotsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import CustomersPage from './pages/CustomersPage';
import GalleryPage from './pages/GalleryPage';
import PaymentsPage from './pages/PaymentsPage';
import CouponsPage from './pages/CouponsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8 text-center">
    <h2 className="text-2xl font-semibold text-primary mb-2">{title}</h2>
    <p className="text-text-secondary">Coming soon</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="pets" element={<PlaceholderPage title="Pet Profiles" />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="slots" element={<SlotsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
