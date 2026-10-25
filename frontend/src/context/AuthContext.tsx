import { useEffect, createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, setAccessToken, setUnauthorizedHandler } from '../lib/api';
import type { AuthUser, AuthTenant, LoginResponse } from '../types';

const TENANT_STORAGE_KEY = 'erp.activeTenant';

function readStoredTenant(): AuthTenant | null {
  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTenant) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenant: AuthTenant | null;
  selectionToken: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const EMPTY_STATE: AuthState = {
  user: null,
  tenants: [],
  activeTenant: null,
  selectionToken: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...EMPTY_STATE, isLoading: true });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TENANT_STORAGE_KEY);
      setState({ ...EMPTY_STATE });
    });
    api
      .post<{ accessToken: string }>('/auth/refresh')
      .then((data: { accessToken: string }) => {
        setAccessToken(data.accessToken);
        setState((s: AuthState) => ({
          ...s,
          accessToken: data.accessToken,
          activeTenant: readStoredTenant(),
          isAuthenticated: true,
          isLoading: false,
        }));
      })
      .catch(() => {
        setState((s: AuthState) => ({ ...s, isLoading: false }));
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.removeItem(TENANT_STORAGE_KEY);
    setState({
      ...EMPTY_STATE,
      user: data.user,
      tenants: data.tenants,
      selectionToken: data.selectionToken,
    });
  }, []);

  const selectTenant = useCallback(
    async (tenantId: string) => {
      if (!state.selectionToken) throw new Error('Sem token de seleção');
      const data = await api.post<{ accessToken: string }>(
        '/auth/select-tenant',
        { tenantId },
        state.selectionToken
      );
      const tenant = state.tenants.find((t) => t.id === tenantId) ?? null;
      if (tenant) localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
      setAccessToken(data.accessToken);
      setState((s: AuthState) => ({
        ...s,
        accessToken: data.accessToken,
        activeTenant: tenant,
        isAuthenticated: true,
        selectionToken: null,
      }));
    },
    [state.selectionToken, state.tenants]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAccessToken(null);
    localStorage.removeItem(TENANT_STORAGE_KEY);
    setState({ ...EMPTY_STATE });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      setState((s: AuthState) => ({ ...s, accessToken: data.accessToken, isAuthenticated: true }));
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, selectTenant, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
