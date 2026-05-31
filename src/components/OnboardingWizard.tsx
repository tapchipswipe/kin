/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Heart,
  UserPlus,
  Users,
  FileUp,
  ArrowRight,
  Sparkles,
  GitBranch,
  ArrowLeft,
} from 'lucide-react';
import { FamilyMember } from '../types';

interface OnboardingWizardProps {
  members: FamilyMember[];
  anchorMemberId: string | null;
  heritageMode: boolean;
  onStartDualHeritage: () => void;
  onStartSingleTree: () => void;
  onAddYourself: (options?: { asAnchor?: boolean }) => void;
  onAddParent: () => void;
  onAddMaternalSide: (heritageLabel: string) => void;
  onAddPaternalSide: (heritageLabel: string) => void;
  onImport: () => void;
  onDismiss: () => void;
}

export function OnboardingWizard({
  members,
  anchorMemberId,
  heritageMode,
  onStartDualHeritage,
  onStartSingleTree,
  onAddYourself,
  onAddParent,
  onAddMaternalSide,
  onAddPaternalSide,
  onImport,
  onDismiss,
}: OnboardingWizardProps) {
  const [path, setPath] = useState<'choose' | 'single' | 'dual'>('choose');
  const [maternalLabel, setMaternalLabel] = useState('');
  const [paternalLabel, setPaternalLabel] = useState('');

  const anchor = anchorMemberId ? members.find((m) => m.id === anchorMemberId) : null;
  const hasMother = Boolean(anchor?.motherId);
  const hasFather = Boolean(anchor?.fatherId);

  const dualStep = useMemo(() => {
    if (!anchor) return 1;
    if (!hasMother) return 2;
    if (!hasFather) return 3;
    return 4;
  }, [anchor, hasMother, hasFather]);

  if (path === 'choose') {
    return (
      <div className="border-2 border-[#E5E1DA] rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-white p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto">
          <Heart className="w-7 h-7 text-rose-500 fill-current" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <span className="text-[10px] font-mono font-bold text-[#A8A29E] uppercase tracking-widest">
            Welcome
          </span>
          <h2 className="text-xl font-serif font-bold text-[#2D2926]">Welcome to Kith & Kin</h2>
          <p className="text-sm text-[#7A7570] leading-relaxed">
            Your cloud-backed family archive. Do you have two family heritages you&apos;d like to
            preserve — where your stories meet at you?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          <button
            onClick={() => {
              onStartDualHeritage();
              setPath('dual');
            }}
            className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-rose-200 rounded-xl hover:border-rose-400 transition-colors cursor-pointer group"
          >
            <GitBranch className="w-7 h-7 text-rose-500" />
            <span className="text-sm font-bold text-[#2D2926]">Two Heritages</span>
            <span className="text-[10px] text-[#7A7570] leading-relaxed">
              Maternal &amp; paternal lines meeting at you
            </span>
          </button>

          <button
            onClick={() => {
              onStartSingleTree();
              setPath('single');
            }}
            className="flex flex-col items-center gap-2 p-5 bg-white border border-[#E5E1DA] rounded-xl hover:border-[#2D2926] transition-colors cursor-pointer group"
          >
            <Users className="w-7 h-7 text-[#7A7570] group-hover:text-[#2D2926]" />
            <span className="text-sm font-bold text-[#2D2926]">Single Tree</span>
            <span className="text-[10px] text-[#7A7570] leading-relaxed">
              One lineage, build outward from anyone
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onImport}
            className="px-4 py-2 text-[#7A7570] text-sm font-medium hover:text-[#2D2926] cursor-pointer flex items-center gap-1.5"
          >
            <FileUp className="w-4 h-4" />
            Import from JSON
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-[#A8A29E] text-xs hover:text-[#7A7570] cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (path === 'single' || (!heritageMode && path !== 'dual')) {
    return (
      <div className="border-2 border-[#E5E1DA] rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-white p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-stone-100 border border-[#E5E1DA] rounded-2xl flex items-center justify-center mx-auto">
          <Users className="w-7 h-7 text-[#7A7570]" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-serif font-bold text-[#2D2926]">Build Your Tree</h2>
          <p className="text-sm text-[#7A7570] leading-relaxed">
            Add family members one at a time, or import an existing tree from a JSON file.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <button
            onClick={() => onAddYourself()}
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

        <button
          onClick={onDismiss}
          className="text-xs text-[#A8A29E] hover:text-[#7A7570] cursor-pointer flex items-center gap-1 mx-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          I&apos;ll explore on my own
        </button>
      </div>
    );
  }

  // Dual heritage path
  const maternalDisplayLabel =
    maternalLabel.trim() || anchor?.heritageLabel || "Mother's side";
  const paternalDisplayLabel = paternalLabel.trim() || "Father's side";

  return (
    <div className="border-2 border-[#E5E1DA] rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-white p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto">
        <GitBranch className="w-7 h-7 text-rose-500" />
      </div>

      {dualStep === 1 && (
        <>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono font-bold text-[#A8A29E] uppercase tracking-widest">
              Step 1 of 3 — Where heritages meet
            </span>
            <h2 className="text-xl font-serif font-bold text-[#2D2926]">Add Yourself</h2>
            <p className="text-sm text-[#7A7570] leading-relaxed">
              You are the meeting point where both family stories connect. Start by adding your
              profile as the anchor of your tree.
            </p>
          </div>
          <button
            onClick={() => onAddYourself({ asAnchor: true })}
            className="px-6 py-2.5 bg-[#2D2926] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1C1A18] cursor-pointer mx-auto"
          >
            <UserPlus className="w-4 h-4" />
            Add Yourself as Anchor
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}

      {dualStep === 2 && anchor && (
        <>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">
              Step 2 of 3 — Maternal line
            </span>
            <h2 className="text-xl font-serif font-bold text-[#2D2926]">Mother&apos;s Side</h2>
            <p className="text-sm text-[#7A7570] leading-relaxed">
              Name this heritage line, then add your mother. You can build grandparents and beyond
              afterward.
            </p>
          </div>
          <div className="max-w-sm mx-auto space-y-3">
            <input
              type="text"
              placeholder='e.g. "Familia materna", "Colombian side"'
              value={maternalLabel}
              onChange={(e) => setMaternalLabel(e.target.value)}
              className="w-full text-sm bg-white border border-[#E5E1DA] rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none"
            />
            <button
              onClick={() => onAddMaternalSide(maternalLabel.trim() || "Mother's side")}
              className="w-full px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-rose-700 cursor-pointer"
            >
              Add Mother
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {dualStep === 3 && anchor && (
        <>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono font-bold text-sky-500 uppercase tracking-widest">
              Step 3 of 3 — Paternal line
            </span>
            <h2 className="text-xl font-serif font-bold text-[#2D2926]">Father&apos;s Side</h2>
            <p className="text-sm text-[#7A7570] leading-relaxed">
              Name this heritage line, then add your father to complete both roots meeting at you.
            </p>
          </div>
          <div className="max-w-sm mx-auto space-y-3">
            <input
              type="text"
              placeholder={'e.g. "Vater\'s family", "German side"'}
              value={paternalLabel}
              onChange={(e) => setPaternalLabel(e.target.value)}
              className="w-full text-sm bg-white border border-[#E5E1DA] rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-sky-400 focus:border-sky-400 outline-none"
            />
            <button
              onClick={() => onAddPaternalSide(paternalLabel.trim() || "Father's side")}
              className="w-full px-6 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-sky-700 cursor-pointer"
            >
              Add Father
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {dualStep === 4 && (
        <>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">
              Both roots connected
            </span>
            <h2 className="text-xl font-serif font-bold text-[#2D2926]">Your Dual Heritage Tree</h2>
            <p className="text-sm text-[#7A7570] leading-relaxed">
              {maternalDisplayLabel} and {paternalDisplayLabel} now meet at {anchor?.firstName}.
              Switch to the Dual Roots view to see both branches, and build each line upward.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="px-6 py-2.5 bg-[#2D2926] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1C1A18] cursor-pointer mx-auto"
          >
            View My Tree
            <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}

      <div className="flex items-center justify-center gap-4 pt-2">
        {dualStep > 1 && dualStep < 4 && (
          <button
            onClick={onDismiss}
            className="text-xs text-[#A8A29E] hover:text-[#7A7570] cursor-pointer"
          >
            Continue later
          </button>
        )}
        <button
          onClick={onImport}
          className="text-xs text-[#7A7570] hover:text-[#2D2926] cursor-pointer flex items-center gap-1"
        >
          <FileUp className="w-3.5 h-3.5" />
          Import instead
        </button>
      </div>
    </div>
  );
}
