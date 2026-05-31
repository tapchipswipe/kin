/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Heart, Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type AuthMode = 'signin' | 'signup' | 'reset' | 'check-email';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.error) setError(result.error);
        else setMessage('Check your email for a link to reset your password.');
      } else if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.error) setError(result.error);
        else setMode('check-email');
      } else {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'check-email') {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-md w-full space-y-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-serif text-[#2D2926]">Check your email</h1>
            <p className="text-base text-[#5C5652] leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>. Open that email and tap the
              link to activate your account, then sign in with your password.
            </p>
          </div>
          <ul className="text-left text-base text-[#5C5652] space-y-2 bg-[#FAF9F6] rounded-xl p-4 border border-[#E5E1DA]">
            <li>1. Open your email app</li>
            <li>2. Look in your spam folder if you don&apos;t see it</li>
            <li>3. Tap the confirmation link</li>
            <li>4. Come back here and sign in with your email and password</li>
          </ul>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
            className="w-full min-h-[48px] bg-[#2D2926] text-white rounded-lg text-lg font-bold hover:bg-[#1C1A18] cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  const showPasswordField = mode !== 'reset';

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7 text-rose-500 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-[#2D2926]">Kith & Kin</h1>
            <p className="text-base text-[#5C5652] mt-2 leading-relaxed">
              {mode === 'signin' && 'Sign in with your email and password.'}
              {mode === 'signup' && 'Create an account with your email and a password.'}
              {mode === 'reset' && 'Enter your email and we will send a password reset link.'}
            </p>
          </div>
        </div>

        {mode !== 'reset' && (
          <div className="flex rounded-xl overflow-hidden border border-[#E5E1DA] text-base" role="tablist">
            {(
              [
                ['signin', 'Sign in'],
                ['signup', 'Create account'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null); setMessage(null); }}
                className={`flex-1 min-h-[48px] font-semibold cursor-pointer transition-colors ${
                  mode === m
                    ? 'bg-[#2D2926] text-white'
                    : 'bg-[#FAF9F6] text-[#5C5652] hover:bg-[#F5F2EF]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-base font-semibold text-[#2D2926] mb-2">
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>

          {showPasswordField && (
            <div>
              <label htmlFor="password" className="block text-base font-semibold text-[#2D2926] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded-lg px-4 py-3 pr-12 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#5C5652] hover:text-[#2D2926] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-sm text-[#5C5652] mt-2">At least 6 characters.</p>
              )}
            </div>
          )}

          {error && (
            <p className="text-base text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-4 py-3" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-base text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] bg-[#2D2926] text-white rounded-lg text-lg font-bold hover:bg-[#1C1A18] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Send reset link'}
          </button>
        </form>

        <div className="text-center text-base text-[#5C5652]">
          {mode === 'signin' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null); setMessage(null); }}
                className="text-[#2D2926] font-semibold hover:underline cursor-pointer min-h-[44px] px-2"
              >
                Forgot password?
              </button>
            </div>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
              className="text-[#2D2926] font-semibold hover:underline cursor-pointer min-h-[44px] px-2"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
