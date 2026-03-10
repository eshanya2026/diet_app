/**
 * App layout: white + pink shell with left sidebar navigation and top header.
 */

import { Link, useLocation, Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { IconSun, IconMoon, IconHome, IconMeal, IconHistory, IconChecklist, IconDroplet, IconScale, IconCog } from './Icons';
import ReminderManager from './ReminderManager';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', Icon: IconHome },
  { to: '/generate', label: 'Generate Plan', Icon: IconMeal },
  { to: '/history', label: 'History', Icon: IconHistory },
  { to: '/compliance', label: 'Compliance', Icon: IconChecklist },
  { to: '/water', label: 'Water', Icon: IconDroplet },
  { to: '/weight', label: 'Weight', Icon: IconScale },
  { to: '/settings', label: 'Settings', Icon: IconCog },
];

export default function Layout() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link to="/" className="app-sidebar__brand" aria-label="Diet AI home">
          <span role="img" aria-hidden="true">🥗</span>
          <span>Diet AI</span>
        </Link>
        <nav className="app-sidebar__nav">
          {NAV_LINKS.map(({ to, label, Icon }) => {
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
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Search…</span>
            <input type="search" aria-label="Search" />
          </div>
          <div className="app-header__actions">
            <button
              type="button"
              className="app-header__btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
            </button>
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
