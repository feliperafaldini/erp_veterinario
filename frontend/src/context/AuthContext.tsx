import { useEffect, createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, setAccessToken, setUnauthorizedHandler } from '../lib/api';
import type { AuthUser, AuthTenant, LoginResponse, MeResponse } from '../types';

interface AuthState {
  user: AuthUser | null;
  tenants: AuthTenant[];
  activeTenant: AuthTenant | null;
  selectionToken: string | null;
  accessToken: string | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  selectTenant: (tenantId: string) => Promise<string[]>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  can: (permission: string) => boolean;
}

const EMPTY_STATE: AuthState = {
  user: null,
  tenants: [],
  activeTenant: null,
  selectionToken: null,
  accessToken: null,
  roles: [],
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...EMPTY_STATE, isLoading: true });

  const applyMe = useCallback((me: MeResponse, accessToken: string) => {
    setState({
      ...EMPTY_STATE,
      user: me.user,
      tenants: [me.tenant],
      activeTenant: me.tenant,
      accessToken,
      roles: me.roles,
      permissions: me.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState({ ...EMPTY_STATE });
    });
    api
      .post<{ accessToken: string }>('/auth/refresh')
      .then(async (data: { accessToken: string }) => {
        setAccessToken(data.accessToken);
        const me = await api.get<MeResponse>('/auth/me');
        applyMe(me, data.accessToken);
      })
      .catch(() => {
        setState((s: AuthState) => ({ ...s, isLoading: false }));
      });
  }, [applyMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
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
      setAccessToken(data.accessToken);
      const me = await api.get<MeResponse>('/auth/me');
      applyMe(me, data.accessToken);
      return me.roles;
    },
    [state.selectionToken, applyMe]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    setAccessToken(null);
    setState({ ...EMPTY_STATE });
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      const me = await api.get<MeResponse>('/auth/me');
      applyMe(me, data.accessToken);
      return true;
    } catch {
      return false;
    }
  }, [applyMe]);

  const can = useCallback(
    (permission: string) => state.permissions.includes(permission),
    [state.permissions]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, selectTenant, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
