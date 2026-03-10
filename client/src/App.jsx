import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import DietResult from './pages/DietResult';
import History from './pages/History';
import Water from './pages/Water';
import Weight from './pages/Weight';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import AdminDietPlans from './admin/AdminDietPlans';
import AdminLoginActivity from './admin/AdminLoginActivity';
import AdminAnalytics from './admin/AdminAnalytics';
import AdminSettings from './admin/AdminSettings';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="diet-plans" element={<AdminDietPlans />} />
        <Route path="login-activity" element={<AdminLoginActivity />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/result" element={<DietResult />} />
        <Route path="/history" element={<History />} />
        <Route path="/water" element={<Water />} />
        <Route path="/weight" element={<Weight />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
