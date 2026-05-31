/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { Save, ArrowRight, ArrowLeft, UserPlus } from 'lucide-react';
import { useAppDialog } from '../hooks/useAppDialog';

const AVATAR_COLORS = ['#5c6bc0', '#ec407a', '#26a69a', '#78909c', '#66bb6a', '#8d6e63'];

interface SimpleMemberFormProps {
  members: FamilyMember[];
  prefillRelation?: {
    memberId: string;
    type: 'father' | 'mother' | 'spouse' | 'child';
  } | null;
  onSave: (member: FamilyMember) => void;
  onCancel: () => void;
  onShowAllDetails: () => void;
}

export function SimpleMemberForm({
  members,
  prefillRelation,
  onSave,
  onCancel,
  onShowAllDetails,
}: SimpleMemberFormProps) {
  const { toast } = useAppDialog();
  const [step, setStep] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('female');
  const [birthPlace, setBirthPlace] = useState('');
  const [biography, setBiography] = useState('');

  React.useEffect(() => {
    if (prefillRelation) {
      const pivot = members.find((m) => m.id === prefillRelation.memberId);
      if (pivot) {
        setLastName(pivot.lastName);
        if (prefillRelation.type === 'father') {
          setGender('male');
        } else if (prefillRelation.type === 'mother') {
          setGender('female');
        }
      }
    }
  }, [prefillRelation, members]);

  const buildMember = (): FamilyMember | null => {
    if (!firstName.trim() || !lastName.trim()) {
      toast('Please enter a first and last name.', 'error');
      return null;
    }
    const birthDate = birthYear.trim() ? birthYear.trim().slice(0, 4) : undefined;

    let fatherId: string | null = null;
    let motherId: string | null = null;
    let childrenIds: string[] = [];

    if (prefillRelation) {
      const pivot = members.find((m) => m.id === prefillRelation.memberId);
      if (pivot) {
        if (prefillRelation.type === 'child') {
          if (pivot.gender === 'male') fatherId = pivot.id;
          else if (pivot.gender === 'female') motherId = pivot.id;
        } else if (prefillRelation.type === 'father') {
          fatherId = null;
          childrenIds = [pivot.id];
        } else if (prefillRelation.type === 'mother') {
          motherId = null;
          childrenIds = [pivot.id];
        }
      }
    }

    return {
      id: `member_local_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      birthDate,
      birthPlace: birthPlace.trim() || undefined,
      biography: biography.trim() || undefined,
      isDeceased: false,
      avatarUrl: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      fatherId,
      motherId,
      spouseIds: [],
      childrenIds,
      events: [],
    };
  };

  const handleFinish = () => {
    const member = buildMember();
    if (!member) return;
    onSave(member);
  };

  return (
    <div className="bg-white border border-[#E5E1DA] rounded-2xl p-6 sm:p-8 space-y-6 text-left max-w-xl mx-auto">
      <div>
        <span className="text-sm font-semibold text-[#5C5652]">
          Step {step + 1} of 3
        </span>
        <h2 className="text-2xl font-serif font-bold text-[#2D2926] mt-1">
          {step === 0 && 'Who are you adding?'}
          {step === 1 && 'Who are their parents?'}
          {step === 2 && 'A little more (optional)'}
        </h2>
        <p className="text-base text-[#5C5652] mt-2 leading-relaxed">
          {step === 0 && 'Start with a name. You can add more details later.'}
          {step === 1 && 'You can skip this and add parents later from the family tree.'}
          {step === 2 && 'Where were they born? Any story you would like to remember?'}
        </p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="sf-first" className="block text-base font-semibold text-[#2D2926] mb-2">
              First name
            </label>
            <input
              id="sf-first"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>
          <div>
            <label htmlFor="sf-last" className="block text-base font-semibold text-[#2D2926] mb-2">
              Last name (family name)
            </label>
            <input
              id="sf-last"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>
          <div>
            <label htmlFor="sf-year" className="block text-base font-semibold text-[#2D2926] mb-2">
              Birth year (optional)
            </label>
            <input
              id="sf-year"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1948"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>
          <div>
            <label htmlFor="sf-gender" className="block text-base font-semibold text-[#2D2926] mb-2">
              Gender
            </label>
            <select
              id="sf-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-base text-[#5C5652]">
            Adding <strong>{firstName} {lastName}</strong>. Would you like to add their parents now?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="min-h-[52px] px-4 py-3 border-2 border-[#E5E1DA] rounded-xl text-base font-semibold text-[#2D2926] hover:border-[#2D2926] cursor-pointer"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={() => {
                handleFinish();
              }}
              className="min-h-[52px] px-4 py-3 bg-rose-50 border-2 border-rose-200 rounded-xl text-base font-semibold text-rose-800 hover:border-rose-400 cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Save, then add parents
            </button>
          </div>
          <p className="text-sm text-[#5C5652]">
            After saving, use the family tree to tap &quot;Add Mother&quot; or &quot;Add Father&quot; on their card.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="sf-place" className="block text-base font-semibold text-[#2D2926] mb-2">
              Where were they born? (optional)
            </label>
            <input
              id="sf-place"
              type="text"
              placeholder="City, state, or country"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>
          <div>
            <label htmlFor="sf-story" className="block text-base font-semibold text-[#2D2926] mb-2">
              Their story (optional)
            </label>
            <textarea
              id="sf-story"
              rows={4}
              placeholder="A few words about who they were..."
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              className="w-full border border-[#E5E1DA] rounded-lg px-4 py-3 text-lg focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {step > 0 && step !== 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="min-h-[48px] px-5 py-2.5 border border-[#E5E1DA] rounded-lg text-base font-semibold text-[#2D2926] hover:bg-[#FAF9F6] cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
        {step === 0 && (
          <button
            type="button"
            onClick={() => {
              if (!firstName.trim() || !lastName.trim()) {
                toast('Please enter a first and last name.', 'error');
                return;
              }
              setStep(1);
            }}
            className="flex-1 min-h-[52px] px-5 py-2.5 bg-[#2D2926] text-white rounded-lg text-lg font-bold hover:bg-[#1C1A18] cursor-pointer flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 min-h-[52px] px-5 py-2.5 bg-[#2D2926] text-white rounded-lg text-lg font-bold hover:bg-[#1C1A18] cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save person
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] px-5 py-2.5 text-base text-[#5C5652] hover:text-[#2D2926] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <button
        type="button"
        onClick={onShowAllDetails}
        className="text-base text-[#5C5652] hover:text-[#2D2926] underline cursor-pointer w-full text-center min-h-[44px]"
      >
        Show all details
      </button>
    </div>
  );
}
