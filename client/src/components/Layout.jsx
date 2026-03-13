/**
 * App layout: sidebar nav, header with theme toggle and user menu (login / profile, logout).
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { IconSun, IconMoon, IconHome, IconMeal, IconHistory, IconChecklist, IconDroplet, IconScale, IconCog, IconUser, IconLogout } from './Icons';

const NAV_LINKS_WITH_PROFILE = [
  { to: '/', label: 'Dashboard', Icon: IconHome },
  { to: '/generate', label: 'Generate Plan', Icon: IconMeal },
  { to: '/history', label: 'History', Icon: IconHistory },
  { to: '/compliance', label: 'Compliance', Icon: IconChecklist },
  { to: '/water', label: 'Water', Icon: IconDroplet },
  { to: '/weight', label: 'Weight', Icon: IconScale },
  { to: '/settings', label: 'Settings', Icon: IconCog },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];
import ReminderManager from './ReminderManager';

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'User';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-sidebar__brand" aria-label="Diet AI home">
          <span role="img" aria-hidden="true">🥗</span>
          <span>Diet AI</span>
        </Link>
        <nav className="app-sidebar__nav">
          {NAV_LINKS_WITH_PROFILE.map(({ to, label, Icon }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`app-sidebar__link ${active ? 'app-sidebar__link--active' : ''}`}
              >
                <Icon className="app-sidebar__link-icon" width={18} height={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar__footer">
          <div>Stay consistent. One meal at a time.</div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="app-header__search">
            <Link to="/history" className="text-muted text-decoration-none" style={{ fontSize: '0.9rem' }}>Search plans</Link>
          </div>
          <div className="app-header__actions" ref={menuRef}>
            <button
              type="button"
              className="app-header__btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
            </button>
            {isAuthenticated ? (
              <div className="position-relative">
                <button
                  type="button"
                  className="app-header__btn app-header__btn--user"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label="User menu"
                >
                  <IconUser width={18} height={18} />
                  <span className="d-none d-md-inline ms-1">{displayName}</span>
                </button>
                {userMenuOpen && (
                  <div className="app-header__dropdown theme-card shadow-theme" role="menu">
                    <Link
                      to="/profile"
                      className="app-header__dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <IconUser width={16} height={16} />
                      Profile
                    </Link>
                    <button
                      type="button"
                      className="app-header__dropdown-item"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <IconLogout width={16} height={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="app-header__btn app-header__btn--user">
                Login
              </Link>
            )}
          </div>
        </header>
        <main className="layout-main page-in">
          <ReminderManager />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
