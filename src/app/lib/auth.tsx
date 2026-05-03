import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiGet, apiPost, apiPut, tokenStore } from './api';
import type { AuthResponse, User } from '../types/api';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (data: ProfilePayload) => Promise<void>;
}

/** Registration — matches CALL CreateCustomer(email, password, first_name, last_name, dob). */
export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;       // YYYY-MM-DD
  phone?: string;
  role?: 'customer' | 'employee';
  job_role?: string;            // only for employee
}

/** Profile update — matches PUT /api/auth/me. */
export interface ProfilePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, if there's a token try to fetch the user
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    apiGet<User>('/api/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await apiPost<AuthResponse>('/api/auth/login', { email, password });
    tokenStore.set(r.access_token);
    setUser(r.user);
  };

  const register = async (data: RegisterPayload) => {
    await apiPost<User>('/api/auth/register', { role: 'customer', ...data });
    // auto-login after register
    await login(data.email, data.password);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const refresh = async () => {
    if (!tokenStore.get()) return;
    try {
      const u = await apiGet<User>('/api/auth/me');
      setUser(u);
    } catch {
      logout();
    }
  };

  const updateProfile = async (data: ProfilePayload) => {
    const u = await apiPut<User>('/api/auth/me', data);
    setUser(u);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
