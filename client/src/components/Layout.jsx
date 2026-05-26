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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-primary/10 bg-white dark:bg-background-dark/50 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-8 !bg-[rgb(244,37,89)] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">nutrition</span>
            </div>
            <Link to="/" className="text-xl font-bold tracking-tight !text-[rgb(244,37,89)] no-underline">Diet AI</Link>
          </div>
          <nav className="space-y-1">
            {NAV_LINKS_WITH_PROFILE.map(({ to, label, Icon }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to));
              if (active) {
                return (
                  <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] !font-bold !no-underline">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              }
              return (
                <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2 rounded-lg !text-[rgb(244,37,89)]/70 dark:!text-[rgb(244,37,89)]/60 hover:bg-[rgb(244,37,89)]/5 hover:!text-[rgb(244,37,89)] transition-colors !font-bold !no-underline">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-6">
          <div className="mt-6 flex items-center gap-3 px-2">
            <div className="size-10 rounded-full border-2 border-[rgb(244,37,89)]/20 bg-[rgb(244,37,89)]/10 flex items-center justify-center !text-[rgb(244,37,89)] font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate mb-0">{displayName}</p>
              <p className="text-xs text-slate-500 truncate mb-0">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/50 dark:bg-background-dark/50 border-b border-primary/10 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-primary/5 border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-slate-400 outline-none text-slate-900 dark:text-slate-100" placeholder="Search for food, recipes, or nutrients..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/5 rounded-full transition-colors bg-transparent border-0 cursor-pointer" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <IconSun className="w-5 h-5 flex-shrink-0" /> : <IconMoon className="w-5 h-5 flex-shrink-0" />}
            </button>
            <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-[rgb(244,37,89)]/5 rounded-full transition-colors bg-transparent border-0 cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 !bg-[rgb(244,37,89)] rounded-full border-2 border-background-light"></span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 !bg-[rgb(244,37,89)]/10 !text-[rgb(244,37,89)] hover:!bg-[rgb(244,37,89)]/20 transition-all rounded-xl border-0 cursor-pointer text-xs font-black uppercase tracking-widest"
            >
              <IconLogout className="w-4 h-4" />
              <span className="hidden md:inline">Log out</span>
            </button>
            <button className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/5 rounded-full bg-transparent border-0 cursor-pointer">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content / Outlet */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <ReminderManager />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
