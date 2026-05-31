/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, UserPlus, Users, FileUp, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingWizardProps {
  onAddYourself: () => void;
  onAddParent: () => void;
  onImport: () => void;
  onDismiss: () => void;
}

export function OnboardingWizard({
  onAddYourself,
  onAddParent,
  onImport,
  onDismiss,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Kith & Kin',
      body: 'Your cloud-backed family archive. Start by adding yourself, then build outward — parents, grandparents, and beyond.',
      icon: Heart,
    },
    {
      title: 'Build Your Tree',
      body: 'Add family members one at a time, or import an existing tree from a JSON file.',
      icon: Users,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="border-2 border-[#E5E1DA] rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-white p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto">
        <Icon className="w-7 h-7 text-rose-500 fill-current" />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <span className="text-[10px] font-mono font-bold text-[#A8A29E] uppercase tracking-widest">
          Step {step + 1} of {steps.length}
        </span>
        <h2 className="text-xl font-serif font-bold text-[#2D2926]">{current.title}</h2>
        <p className="text-sm text-[#7A7570] leading-relaxed">{current.body}</p>
      </div>

      {step === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setStep(1)}
            className="px-6 py-2.5 bg-[#2D2926] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1C1A18] cursor-pointer"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2.5 text-[#7A7570] text-sm font-medium hover:text-[#2D2926] cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <button
            onClick={onAddYourself}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-[#E5E1DA] rounded-xl hover:border-[#2D2926] transition-colors cursor-pointer group"
          >
            <UserPlus className="w-6 h-6 text-[#7A7570] group-hover:text-[#2D2926]" />
            <span className="text-xs font-bold text-[#2D2926]">Add Yourself</span>
            <span className="text-[10px] text-[#7A7570]">Start with you</span>
          </button>

          <button
            onClick={onAddParent}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-[#E5E1DA] rounded-xl hover:border-[#2D2926] transition-colors cursor-pointer group"
          >
            <Users className="w-6 h-6 text-[#7A7570] group-hover:text-[#2D2926]" />
            <span className="text-xs font-bold text-[#2D2926]">Add a Parent</span>
            <span className="text-[10px] text-[#7A7570]">After adding yourself</span>
          </button>

          <button
            onClick={onImport}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-[#E5E1DA] rounded-xl hover:border-[#2D2926] transition-colors cursor-pointer group"
          >
            <FileUp className="w-6 h-6 text-[#7A7570] group-hover:text-[#2D2926]" />
            <span className="text-xs font-bold text-[#2D2926]">Import Tree</span>
            <span className="text-[10px] text-[#7A7570]">From JSON file</span>
          </button>
        </div>
      )}

      {step === 1 && (
        <button
          onClick={onDismiss}
          className="text-xs text-[#A8A29E] hover:text-[#7A7570] cursor-pointer flex items-center gap-1 mx-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          I'll explore on my own
        </button>
      )}
    </div>
  );
}
