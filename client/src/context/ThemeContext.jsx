/**
 * Theme context: pinkish elegant light and dark with persistence.
 */

import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'diet_app_theme';

const ThemeContext = createContext(null);

const themes = {
  light: {
    name: 'light',
    bg: '#fdf2f8',
    bgSecondary: '#fce7f3',
    text: '#701a75',
    textMuted: '#9d174d',
    border: '#fbcfe8',
    primary: 'rgb(244, 37, 89)',
    accent: 'rgb(244, 37, 89)',
    cardBg: '#ffffff',
    inputBg: '#ffffff',
  },
  dark: {
    name: 'dark',
    bg: '#1a0a12',
    bgSecondary: '#2d0f1a',
    text: '#fce7f3',
    textMuted: '#f9a8d4',
    border: '#4c0519',
    primary: 'rgb(244, 37, 89)',
    accent: 'rgb(244, 37, 89)',
    cardBg: '#251118',
    inputBg: '#2d0f1a',
  },
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return 'light';
  });

  useEffect(() => {
    const t = themes[theme];
    if (!t) return;
    const root = document.documentElement;
    root.style.setProperty('--theme-bg', t.bg);
    root.style.setProperty('--theme-bg-secondary', t.bgSecondary);
    root.style.setProperty('--theme-text', t.text);
    root.style.setProperty('--theme-text-muted', t.textMuted);
    root.style.setProperty('--theme-border', t.border);
    root.style.setProperty('--theme-primary', t.primary);
    root.style.setProperty('--theme-accent', t.accent ?? t.primary);
    root.style.setProperty('--theme-card-bg', t.cardBg);
    root.style.setProperty('--theme-input-bg', t.inputBg);
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {}
  }, [theme]);

  const setTheme = (value) => {
    if (value === 'dark' || value === 'light') setThemeState(value);
  };

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
