/**
 * Protects admin routes: redirects to /admin/login if no token.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { hasAdminToken } from '../api/adminApi';

export default function AdminGuard({ children }) {
  const location = useLocation();
  if (!hasAdminToken()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return children;
}
