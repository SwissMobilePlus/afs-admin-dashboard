'use client';

import { create } from 'zustand';
import {
  requestOtp as authRequestOtp,
  verifyOtp as authVerifyOtp,
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

  // OTP flow state
  otpStep: 'email' | 'code';
  otpEmail: string | null;
  otpExpiresInSeconds: number | null;

  // Actions
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resetOtpFlow: () => void;
  logout: () => void;
  initialize: () => void;
  clearError: () => void;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    // Axios wraps the response message
    const axiosErr = err as any;
    if (axiosErr.response?.data?.message) {
      return axiosErr.response.data.message;
    }
    return err.message;
  }
  return 'Erreur de connexion';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  otpStep: 'email',
  otpEmail: null,
  otpExpiresInSeconds: null,

  requestOtp: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authRequestOtp(email);
      set({
        isLoading: false,
        otpStep: 'code',
        otpEmail: email,
        otpExpiresInSeconds: response.expiresInSeconds,
        error: null,
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: extractErrorMessage(err),
      });
    }
  },

  verifyOtp: async (code: string) => {
    const { otpEmail } = get();
    if (!otpEmail) return;

    set({ isLoading: true, error: null });
    try {
      const user = await authVerifyOtp(otpEmail, code);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        otpStep: 'email',
        otpEmail: null,
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: extractErrorMessage(err),
      });
    }
  },

  resetOtpFlow: () => {
    set({
      otpStep: 'email',
      otpEmail: null,
      otpExpiresInSeconds: null,
      error: null,
    });
  },

  logout: () => {
    authLogout();
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      otpStep: 'email',
      otpEmail: null,
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
