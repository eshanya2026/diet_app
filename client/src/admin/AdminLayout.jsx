/**
 * Admin layout: sidebar navigation + main content. Same Vite app/port as user app.
 */

import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { clearAdminToken } from '../api/adminApi';

const SIDEBAR_LINKS = [
  { to: '/admin', end: true, label: 'Dashboard' },
  { to: '/admin/users', end: false, label: 'Users' },
  { to: '/admin/diet-plans', end: false, label: 'Diet Plans' },
  { to: '/admin/login-activity', end: false, label: 'Login Activity' },
  { to: '/admin/analytics', end: false, label: 'Analytics' },
  { to: '/admin/settings', end: false, label: 'Settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      <aside className="admin-sidebar bg-dark text-white p-3" style={{ width: 220 }}>
        <h5 className="mb-3 px-2">Admin Panel</h5>
        <nav className="nav flex-column">
          {SIDEBAR_LINKS.map(({ to, end, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link text-white py-2 ${location.pathname === to || (!end && location.pathname.startsWith(to)) ? 'bg-secondary rounded' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <hr className="border-secondary my-3" />
        <Link to="/login" className="nav-link text-white-50 small">Back to App</Link>
        <button type="button" className="btn btn-outline-light btn-sm mt-2 w-100" onClick={handleLogout}>
          Logout
        </button>
      </aside>
      <main className="flex-grow-1 p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
