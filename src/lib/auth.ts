import { post } from './api';

const TOKEN_KEY = 'afs_admin_token';

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

// ── JWT payload types ─────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support' | 'partner';
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
    return JSON.parse(decoded) as AdminUser;
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
      return false;
    }
  }

  return true;
}

// ── Login ─────────────────────────────────────────────────────────────

interface LoginResponse {
  token: string;
  user: AdminUser;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const data = await post<LoginResponse>('/auth/admin/login', {
    email,
    password,
  });
  setToken(data.token);
  return data;
}

// ── Logout ────────────────────────────────────────────────────────────

export function logout(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
