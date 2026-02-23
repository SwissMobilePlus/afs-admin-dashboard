import { post } from './api';

const TOKEN_KEY = 'afs_admin_token';
const REFRESH_TOKEN_KEY = 'afs_admin_refresh_token';

// ── Token helpers ─────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

function removeRefreshToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── JWT payload types ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  role: 'super_admin' | 'admin' | 'support';
  sub?: string;
  iat?: number;
  exp?: number;
}

// ── Decode JWT payload ────────────────────────────────────────────────

function decodeJwtPayload(token: string): AdminUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    // Map JWT 'sub' field to 'id'
    return {
      ...parsed,
      id: parsed.sub || parsed.id,
    } as AdminUser;
  } catch {
    return null;
  }
}

// ── Get current user from stored token ────────────────────────────────

export function getUser(): AdminUser | null {
  const token = getToken();
  if (!token) return null;
  return decodeJwtPayload(token);
}

// ── Check if authenticated and token is not expired ───────────────────

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const user = decodeJwtPayload(token);
  if (!user) return false;

  // If there is an exp claim, verify the token has not expired
  if (user.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (user.exp < now) {
      removeToken();
      removeRefreshToken();
      return false;
    }
  }

  return true;
}

// ── OTP Login ─────────────────────────────────────────────────────────

interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AdminUser;
}

/**
 * Step 1: Request OTP code for admin login
 */
export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  return post<RequestOtpResponse>('/auth/admin/request-otp', { email });
}

/**
 * Step 2: Verify OTP code and get JWT tokens
 */
export async function verifyOtp(email: string, code: string): Promise<AdminUser> {
  const data = await post<VerifyOtpResponse>('/auth/admin/verify-otp', { email, code });
  setToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data.user;
}

// ── Logout ────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await post('/auth/logout', {});
  } catch {
    // Continue with local cleanup even if server call fails
  }
  removeToken();
  removeRefreshToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
