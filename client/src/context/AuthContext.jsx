/**
 * Auth context: logged-in user (id, email, name), login, logout.
 * Syncs dietUserId with user.id so history/settings work for logged-in users.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser } from '../api/dietApi';

const USER_KEY = 'diet_app_user';
const TOKEN_KEY = 'diet_app_token';
const USER_ID_KEY = 'dietUserId';

function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u && typeof u.id === 'string') return u;
  } catch (_) {}
  return null;
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(loadStoredUser);

  useEffect(() => {
    const u = loadStoredUser();
    setUserState(u);
    if (u?.id) {
      try {
        sessionStorage.setItem(USER_ID_KEY, u.id);
      } catch (_) {}
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginUser(email, password);
    if (!res?.success || !res?.data?.user?.id) {
      throw new Error(res?.error?.message ?? 'Login failed.');
    }
    const { token, user: u } = res.data;
    try {
      sessionStorage.setItem(TOKEN_KEY, token ?? '');
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
      sessionStorage.setItem(USER_ID_KEY, u.id);
    } catch (_) {}
    setUserState(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_ID_KEY);
    } catch (_) {}
  }, []);

  const setUser = useCallback((u) => {
    setUserState(u ?? null);
    if (u?.id) {
      try {
        sessionStorage.setItem(USER_KEY, JSON.stringify(u));
        sessionStorage.setItem(USER_ID_KEY, u.id);
      } catch (_) {}
    } else {
      try {
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(USER_ID_KEY);
      } catch (_) {}
    }
  }, []);

  const value = { user, login, logout, setUser, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? { user: null, login: async () => {}, logout: () => {}, setUser: () => {}, isAuthenticated: false };
}
