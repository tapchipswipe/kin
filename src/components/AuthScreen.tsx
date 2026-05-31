/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type AuthMode = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.error) {
          setError(result.error);
        } else {
          setMessage('Check your email for a password reset link.');
        }
      } else if (mode === 'signup') {
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          setMessage('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center font-sans tracking-tight px-4">
      <div className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-sm w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[#2D2926] leading-tight">
              Kith & Kin
            </h1>
            <p className="text-xs text-[#7A7570] mt-1.5 leading-relaxed">
              {mode === 'signin' && 'Sign in to access your family archive.'}
              {mode === 'signup' && 'Create an account to start your lineage.'}
              {mode === 'reset' && 'Enter your email to reset your password.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#2D2926]"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2D2926] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-xs hover:bg-[#1C1A18] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center text-xs text-[#7A7570] space-y-2">
          {mode === 'signin' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                className="text-[#2D2926] font-semibold hover:underline cursor-pointer"
              >
                Create an account
              </button>
              <span className="mx-2">·</span>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(null); setMessage(null); }}
                className="text-[#2D2926] font-semibold hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </>
          )}
          {mode !== 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
              className="text-[#2D2926] font-semibold hover:underline cursor-pointer"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
