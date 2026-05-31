/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, updateUserProfileNames } from '../lib/profileDb';

interface ProfileSetupProps {
  userId: string;
  onComplete: (profile: UserProfile) => void;
}

export function ProfileSetup({ userId, onComplete }: ProfileSetupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUserProfileNames(userId, firstName, lastName);
      onComplete({
        id: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-md w-full space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-serif font-bold text-[#2D2926]">Welcome to the family</h1>
          <p className="text-base text-[#5C5652]">
            Your name helps relatives find and connect with you in the Collaboration Hub.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2D2926] mb-1">First name</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-base"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#2D2926] mb-1">Last name</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-base"
              autoComplete="family-name"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[48px] bg-[#2D2926] text-white rounded-lg text-lg font-bold hover:bg-[#1C1A18] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
