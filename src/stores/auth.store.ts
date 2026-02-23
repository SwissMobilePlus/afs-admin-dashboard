'use client';

import { create } from 'zustand';
import {
  login as authLogin,
  logout as authLogout,
  getUser,
  isAuthenticated as checkAuth,
  AdminUser,
} from '@/lib/auth';

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authLogin(email, password);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Erreur de connexion';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  logout: () => {
    authLogout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  initialize: () => {
    const authenticated = checkAuth();
    if (authenticated) {
      const user = getUser();
      set({ user, isAuthenticated: true });
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
