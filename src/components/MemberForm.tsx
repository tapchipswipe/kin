/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppDialog } from '../hooks/useAppDialog';
import { FamilyMember, TimelineEvent } from '../types';
import { Save, Plus, Trash2, Calendar, User, Heart, Users, MapPin, Briefcase } from 'lucide-react';

interface MemberFormProps {
  members: FamilyMember[];
  editMemberId: string | null;            // If null, we are in "Create New" mode
  prefillRelation?: {                     // Optional prefill context from TreeCanvas
    memberId: string;
    type: 'father' | 'mother' | 'spouse' | 'child';
  } | null;
  onSave: (member: FamilyMember) => void;
  onCancel: () => void;
}

const AVATAR_COLORS = [
  '#5c6bc0', // Slate Indigo
  '#ec407a', // Rosy Pink
  '#3f51b5', // Royal Blue
  '#26a69a', // Teal Green
  '#ab47bc', // Purple
  '#78909c', // Blue Grey
  '#0288d1', // Rich Blue
  '#66bb6a', // Green
  '#ff7043', // Deep Orange
  '#8d6e63', // Warm Brown
  '#00af91', // Emerald
  '#f57c00', // Deep Amber
  '#9ccc65', // Olive Lime
  '#ea9085', // Peach Coral
];

export const MemberForm: React.FC<MemberFormProps> = ({
  members,
  editMemberId,
  prefillRelation,
  onSave,
  onCancel,
}) => {
  const { toast } = useAppDialog();
  const isEditMode = !!editMemberId;
  const targetMember = isEditMode ? members.find((m) => m.id === editMemberId) : null;

  // --- Core State Variables ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maidenName, setMaidenName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_COLORS[0]);

  // Direct relationship configurations
  const [fatherId, setFatherId] = useState<string>('');
  const [motherId, setMotherId] = useState<string>('');
  const [spouseIds, setSpouseIds] = useState<string[]>([]);
  const [childrenIds, setChildrenIds] = useState<string[]>([]);

  // Individual Timeline Milestones list
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Temp inline inputs to add a milestone
  const [tempYear, setTempYear] = useState<number>(new Date().getFullYear());
  const [tempTitle, setTempTitle] = useState('');
  const [tempDesc, setTempDesc] = useState('');
  const [tempLoc, setTempLoc] = useState('');

  // --- Load Initial Form State ---
  useEffect(() => {
    if (isEditMode && targetMember) {
      setFirstName(targetMember.firstName);
      setLastName(targetMember.lastName);
      setMaidenName(targetMember.maidenName || '');
      setGender(targetMember.gender);
      setBirthDate(targetMember.birthDate || '');
      setBirthPlace(targetMember.birthPlace || '');
      setIsDeceased(targetMember.isDeceased);
      setDeathDate(targetMember.deathDate || '');
      setDeathPlace(targetMember.deathPlace || '');
      setOccupation(targetMember.occupation || '');
      setBiography(targetMember.biography || '');
      setAvatarUrl(targetMember.avatarUrl || AVATAR_COLORS[0]);

      setFatherId(targetMember.fatherId || '');
      setMotherId(targetMember.motherId || '');
      setSpouseIds(targetMember.spouseIds || []);
      setChildrenIds(targetMember.childrenIds || []);
      setEvents(targetMember.events || []);
    } else {
      // --- Create Mode configuration (with potential Pre-fills!) ---
      setFirstName('');
      let defaultLastName = '';
      let defaultGender: 'male' | 'female' | 'other' = 'male';
      let defFather = '';
      let defMother = '';
      let defSpouses: string[] = [];
      let defChildren: string[] = [];

      if (prefillRelation) {
        const pivotMember = members.find((m) => m.id === prefillRelation.memberId);
        if (pivotMember) {
          defaultLastName = pivotMember.lastName;

          if (prefillRelation.type === 'child') {
            // Pivot is the parent. Configure parent links automatically.
            if (pivotMember.gender === 'male') {
              defFather = pivotMember.id;
            } else if (pivotMember.gender === 'female') {
              defMother = pivotMember.id;
            }
          } else if (prefillRelation.type === 'father') {
            defaultGender = 'male';
            defChildren = [pivotMember.id];
          } else if (prefillRelation.type === 'mother') {
            defaultGender = 'female';
            defChildren = [pivotMember.id];
          } else if (prefillRelation.type === 'spouse') {
            defSpouses = [pivotMember.id];
            // set inverse gender default
            defaultGender = pivotMember.gender === 'male' ? 'female' : 'male';
          }
        }
      }

      setLastName(defaultLastName);
      setGender(defaultGender);
      setMaidenName('');
      setBirthDate('');
      setBirthPlace('');
      setIsDeceased(false);
      setDeathDate('');
      setDeathPlace('');
      setOccupation('');
      setBiography('');
      setAvatarUrl(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);

      setFatherId(defFather);
      setMotherId(defMother);
      setSpouseIds(defSpouses);
      setChildrenIds(defChildren);
      setEvents([]);
    }
  }, [editMemberId, isEditMode, targetMember, prefillRelation, members]);

  // --- Filtering candidate relatives ---
  // Exclude current member to avoid recursive self-parenting
  const maleMembers = members.filter((m) => m.gender === 'male' && (!isEditMode || m.id !== editMemberId));
  const femaleMembers = members.filter((m) => m.gender === 'female' && (!isEditMode || m.id !== editMemberId));
  const marriageCandidates = members.filter((m) => !isEditMode || m.id !== editMemberId);
  const childCandidates = members.filter((m) => !isEditMode || m.id !== editMemberId);

  // --- Add Timeline Event Milestone inline ---
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempTitle.trim() === '') return;

    const newEvent: TimelineEvent = {
      id: `evt_local_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      year: tempYear,
      title: tempTitle.trim(),
      description: tempDesc.trim() || undefined,
      location: tempLoc.trim() || undefined,
    };

    setEvents((prev) => {
      const list = [...prev, newEvent];
      // Keep chronological
      list.sort((a, b) => a.year - b.year);
      return list;
    });

    // Reset inline inputs
    setTempTitle('');
    setTempDesc('');
    setTempLoc('');
    setTempYear(new Date().getFullYear());
  };

  const handleRemoveMilestone = (evtId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== evtId));
  };

  // --- Handle Main Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() === '' || lastName.trim() === '') {
      toast('First Name and Last Name are required.', 'error');
      return;
    }

    const payload: FamilyMember = {
      id: isEditMode && targetMember ? targetMember.id : `member_local_${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      maidenName: maidenName.trim() || undefined,
      gender,
      birthDate: birthDate || undefined,
      birthPlace: birthPlace.trim() || undefined,
      deathDate: isDeceased ? (deathDate || undefined) : undefined,
      deathPlace: isDeceased ? (deathPlace.trim() || undefined) : undefined,
      isDeceased,
      biography: biography.trim() || undefined,
      avatarUrl,
      
      fatherId: fatherId || null,
      motherId: motherId || null,
      spouseIds,
      childrenIds,
      events,
    };

    onSave(payload);
  };

  const handleToggleSpouse = (spId: string) => {
    setSpouseIds((prev) =>
      prev.includes(spId) ? prev.filter((id) => id !== spId) : [...prev, spId]
    );
  };

  const handleToggleChild = (cId: string) => {
    setChildrenIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-10 text-left select-none text-[#2D2926]">
      
      {/* 0. Form Mode Indicator Header */}
      <div className="border-b border-[#E5E1DA] pb-4">
        <h3 className="text-xl font-serif font-bold text-[#2D2926]">
          {isEditMode ? `Edit Profile & Lineage` : `Add Family Member Registry`}
        </h3>
        <p className="text-xs text-[#7A7570] mt-1">
          {isEditMode 
            ? 'Modify biographical parameters, historic timelines, and family relationships.'
            : 'Fill in the record card to inject a new ancestor or descendant node into your tree.'}
        </p>
      </div>

      {/* 1. Vital Stats & Demographics Group */}
      <section className="bg-white p-6 rounded-xl border border-[#E5E1DA] space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <User className="w-4 h-4 text-[#A8A29E]" /> Vital Demographics
        </h4>

        {/* Name Block */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full text-xs font-medium bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Last Name / Family Name *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full text-xs font-medium bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Maiden Name / Birth Name</label>
            <input
              type="text"
              placeholder="If different"
              value={maidenName}
              onChange={(e) => setMaidenName(e.target.value)}
              className="w-full text-xs font-medium bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
            />
          </div>
        </div>

        {/* Gender, Colors, Career Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Biological Gender Selection</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full text-xs bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none font-semibold"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Non-binary</option>
            </select>
          </div>

          {/* Profession */}
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Primary Occupation / Calling</label>
            <input
              type="text"
              placeholder="e.g. Botanist, Carpenter, Artist"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full text-xs bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
            />
          </div>

          {/* Avatar Color */}
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Visual Tree Color Hue</label>
            <div className="flex flex-wrap gap-1.5 items-center justify-start h-9 border border-[#E5E1DA] bg-[#FAF9F6] px-2 rounded-lg">
              {AVATAR_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setAvatarUrl(color)}
                  className={`w-4 h-4 rounded-full border transition-all shrink-0 cursor-pointer ${
                    avatarUrl === color ? 'scale-125 ring-1 ring-[#2D2926] border-white' : 'border-stone-100'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Biography Block */}
        <div>
          <label className="block text-xs font-semibold text-[#2D2926] mb-1">Archival Biography & Notes</label>
          <textarea
            rows={4}
            placeholder="Write a custom overview describing who this person was, major life themes, personal qualities, or historical achievements..."
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            className="w-full text-xs bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
          />
        </div>
      </section>

      {/* 2. Chronological Milestones (Birth vs Passing) */}
      <section className="bg-white p-6 rounded-xl border border-[#E5E1DA] space-y-4">
        <h4 className="text-[#A8A29E] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <Calendar className="w-4 h-4 text-[#A8A29E]" /> Key Lifespan Chronicles
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Birth coordinates */}
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E1DA] space-y-3">
            <h5 className="text-[11px] font-bold text-[#2D2926] uppercase tracking-widest flex items-center gap-1">
              🎂 Birth Arrival
            </h5>
            
            <div>
              <label className="block text-xs font-semibold text-[#2D2926] mb-1">Birth Date (YYYY-MM-DD or Year)</label>
              <input
                type="text"
                placeholder="e.g. 1912-08-30 or 1912"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-white text-xs border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D2926] mb-1">Birth Location</label>
              <input
                type="text"
                placeholder="City, State, Country"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                className="w-full bg-white text-xs border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
              />
            </div>
          </div>

          {/* Passing coordinates */}
          <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E1DA] space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-[#2D2926] uppercase tracking-widest flex items-center gap-1">
                🕯️ Final Passing
              </h5>
              <label className="flex items-center gap-1.5 text-xs text-[#2D2926] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDeceased}
                  onChange={(e) => setIsDeceased(e.target.checked)}
                  className="rounded border-[#E5E1DA] text-[#2D2926] focus:ring-[#2D2926] accent-[#2D2926] pointer-events-auto h-3.5 w-3.5 shrink-0"
                />
                Is Deceased
              </label>
            </div>

            {isDeceased ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D2926] mb-1">Death Date (YYYY-MM-DD or Year)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1995-12-04 or 1995"
                    value={deathDate}
                    onChange={(e) => setDeathDate(e.target.value)}
                    className="w-full bg-white text-xs border border-[#E5E1DA] rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] text-[#2D2926] outline-hidden outline-none font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D2926] mb-1">Interment / Passing Location</label>
                  <input
                    type="text"
                    placeholder="City, State, Country"
                    value={deathPlace}
                    onChange={(e) => setDeathPlace(e.target.value)}
                    className="w-full bg-white text-xs border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="h-[96px] flex items-center justify-center text-center text-xs text-[#7A7570] italic bg-white/40 rounded-lg border border-dashed border-[#E5E1DA]">
                Mark 'Is Deceased' to log passing dates & locations
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Biological Ancestors Relationship Group */}
      <section className="bg-white p-6 rounded-xl border border-[#E5E1DA] space-y-4 font-sans">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <Users className="w-4 h-4 text-[#A8A29E]" /> Relational Connections
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Father */}
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Father Pointer</label>
            <select
              value={fatherId}
              onChange={(e) => setFatherId(e.target.value)}
              className="w-full text-xs bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none font-medium"
            >
              <option value="">No Father Recorded</option>
              {maleMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} (b. {m.birthDate ? m.birthDate.slice(0, 4) : '????'}, ID: {m.id})
                </option>
              ))}
            </select>
          </div>

          {/* Mother */}
          <div>
            <label className="block text-xs font-semibold text-[#2D2926] mb-1">Mother Pointer</label>
            <select
              value={motherId}
              onChange={(e) => setMotherId(e.target.value)}
              className="w-full text-xs bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none font-medium"
            >
              <option value="">No Mother Recorded</option>
              {femaleMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} (b. {m.birthDate ? m.birthDate.slice(0, 4) : '????'}, ID: {m.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-spouses Selection Tab */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-[#2D2926]">Spouse Connections</label>
          <div className="bg-[#FAF9F6] p-4 border border-[#E5E1DA] rounded-xl space-y-2">
            <span className="text-[10px] text-[#A8A29E] uppercase tracking-widest font-mono block">Toggle marriages (multi-select)</span>
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs">
              {marriageCandidates.length > 0 ? (
                marriageCandidates.map((m) => {
                  const isChecked = spouseIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#E5E1DA]/30 transition-colors cursor-pointer text-[#2D2926]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSpouse(m.id)}
                        className="rounded border-[#E5E1DA] text-[#2D2926] focus:ring-[#2D2926] accent-[#2D2926] pointer-events-auto shrink-0 h-3.5 w-3.5"
                      />
                      <span className="font-medium">
                        {m.firstName} {m.lastName} <span className="font-mono text-[#A8A29E] text-[10px] ml-1">({m.birthDate ? m.birthDate.slice(0, 4) : '????'}, ID: {m.id})</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="text-[#A8A29E] italic font-medium p-4 text-center">No spouses available inside tree directory.</div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-children Selection Tab */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-[#2D2926]">Children Connections</label>
          <div className="bg-[#FAF9F6] p-4 border border-[#E5E1DA] rounded-xl space-y-2">
            <span className="text-[10px] text-[#A8A29E] uppercase tracking-widest font-mono block">Toggle designated descendants (multi-select)</span>
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 text-xs">
              {childCandidates.length > 0 ? (
                childCandidates.map((m) => {
                  const isChecked = childrenIds.includes(m.id);
                  return (
                    <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-[#E5E1DA]/30 transition-colors cursor-pointer text-[#2D2926]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleChild(m.id)}
                        className="rounded border-[#E5E1DA] text-[#2D2926] focus:ring-[#2D2926] accent-[#2D2926] pointer-events-auto shrink-0 h-3.5 w-3.5"
                      />
                      <span className="font-medium">
                        {m.firstName} {m.lastName} <span className="font-mono text-[#A8A29E] text-[10px] ml-1">({m.birthDate ? m.birthDate.slice(0, 4) : '????'}, ID: {m.id})</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="text-[#A8A29E] italic font-medium p-4 text-center">No children available inside tree directory.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. History Milestone Timeline Event Logger */}
      <section className="bg-white p-6 rounded-xl border border-[#E5E1DA] space-y-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <Plus className="w-4 h-4 text-[#A8A29E]" /> Custom Historical Milestones & Achievements
        </h4>

        {/* Existing event milestones listed for deleting */}
        {events.length > 0 ? (
          <div className="border border-[#E5E1DA] rounded-xl divide-y divide-[#E5E1DA] overflow-hidden text-xs text-[#2D2926]">
            {events.map((evt) => (
              <div key={evt.id} className="p-3.5 bg-[#FAF9F6]/50 flex justify-between items-start gap-4">
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2D2926] font-mono text-xs">{evt.year}</span>
                    <span className="font-semibold text-[#2D2926]">{evt.title}</span>
                  </div>
                  {evt.description && <p className="text-[#7A7570] font-normal leading-relaxed">{evt.description}</p>}
                  {evt.location && (
                    <div className="flex items-center gap-1 text-[10px] text-[#A8A29E] font-mono pt-1">
                      <MapPin className="w-3 h-3" /> {evt.location}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(evt.id)}
                  className="text-[#A8A29E] hover:text-red-500 p-1 rounded hover:bg-[#FAF9F6] cursor-pointer shrink-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#7A7570] border border-dashed border-[#E5E1DA] rounded-xl bg-[#FAF9F6]/20 italic">
            No custom historical milestones logged. Use the form below to register events like graduations, migrations, or weddings!
          </div>
        )}

        {/* Inline form to ADD dynamic events */}
        <div className="bg-[#FAF9F6]/60 border border-[#E5E1DA] rounded-xl p-4 space-y-3 text-xs">
          <span className="text-[11px] font-bold text-[#2D2926] uppercase tracking-widest block font-sans">Add New Event Card</span>
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-semibold text-[#7A7570] uppercase mb-1 font-sans">Event Year</label>
              <input
                type="number"
                value={tempYear}
                onChange={(e) => setTempYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs font-mono outline-hidden outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>
            
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-semibold text-[#7A7570] uppercase mb-1 font-sans">Event Title *</label>
              <input
                type="text"
                placeholder="e.g. Enlisted in WWII, Graduated MIT"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs font-normal outline-hidden outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] font-semibold text-[#7A7570] uppercase mb-1 font-sans">Event Location</label>
              <input
                type="text"
                placeholder="City, Country"
                value={tempLoc}
                onChange={(e) => setTempLoc(e.target.value)}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs outline-hidden outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#7A7570] uppercase mb-1 font-sans">Detailed Event Story</label>
            <textarea
              rows={2}
              placeholder="Provide a brief historic narration of the event milestone..."
              value={tempDesc}
              onChange={(e) => setTempDesc(e.target.value)}
              className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs outline-hidden outline-none focus:ring-1 focus:ring-[#2D2926]"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAddMilestone}
              className="px-4 py-1.5 bg-[#2D2926] hover:bg-[#1C1A18] text-[#FAF9F6] border border-transparent rounded text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Commit Milestone Event
            </button>
          </div>
        </div>
      </section>

      {/* 5. Cancel and Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E1DA]">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-[#E5E1DA] bg-white text-[#2D2926] text-xs font-bold hover:bg-[#FAF9F6] transition-colors cursor-pointer"
        >
          Cancel Change
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-[#2D2926] hover:bg-[#1C1A18] text-[#FAF9F6] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" /> Save Family Record
        </button>
      </div>

    </form>
  );
};
