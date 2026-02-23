'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const {
    isLoading,
    error,
    clearError,
    isAuthenticated,
    initialize,
    otpStep,
    otpEmail,
    requestOtp,
    verifyOtp,
    resetOtpFlow,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Focus code input when switching to code step
  useEffect(() => {
    if (otpStep === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [otpStep]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await requestOtp(email.trim().toLowerCase());
    setResendCooldown(60);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    await verifyOtp(code.trim());
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    clearError();
    setCode('');
    await requestOtp(otpEmail || email);
    setResendCooldown(60);
  };

  const handleChangeEmail = () => {
    setCode('');
    resetOtpFlow();
  };

  // Auto-submit when 6 digits entered
  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
  };

  const inputClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const buttonClass =
    'flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="mb-8 text-center">
          <img
            src="/logo-afs.png"
            alt="AFS - Aide Frontalier Suisse"
            className="mx-auto mb-4 h-16 w-auto"
          />
          <h1 className="text-2xl font-semibold text-foreground">
            AFS Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous pour acc&eacute;der au panneau d&apos;administration
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Step 1: Email */}
        {otpStep === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aidefrontaliersuisse.ch"
                required
                autoComplete="email"
                autoFocus
                className={inputClass}
              />
            </div>

            <button type="submit" disabled={isLoading || !email.trim()} className={buttonClass}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Envoi en cours...</span>
                </div>
              ) : (
                'Recevoir le code'
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Code */}
        {otpStep === 'code' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Info message */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              Un code &agrave; 6 chiffres a &eacute;t&eacute; envoy&eacute; &agrave;{' '}
              <strong>{otpEmail}</strong>
            </div>

            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-foreground">
                Code de v&eacute;rification
              </label>
              <input
                ref={codeInputRef}
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                className={`${inputClass} text-center text-xl font-mono tracking-[0.5em]`}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className={buttonClass}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>V&eacute;rification...</span>
                </div>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Actions */}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isLoading}
                className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {resendCooldown > 0
                  ? `Renvoyer (${resendCooldown}s)`
                  : 'Renvoyer le code'}
              </button>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Changer d&apos;email
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          AFS Administration &mdash; Acc&egrave;s restreint
        </p>
      </div>
    </div>
  );
}
