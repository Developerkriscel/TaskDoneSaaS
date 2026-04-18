import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;
    authApi
      .me()
      .then((payload) => {
        if (!mounted) return;
        setUser({
          name: payload.userName,
          role: payload.role,
          roleName: payload.roleName,
          isAppAdmin: Boolean(payload.isAppAdmin),
          companyId: payload.companyId,
          loginScope: payload.loginScope,
          companyFeatures: payload.companyFeatures || null
        });
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      login(payload) {
        setUser(payload);
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout network failures and force local state clear.
        }
        setUser(null);
      }
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
