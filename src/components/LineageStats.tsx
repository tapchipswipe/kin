/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { FamilyMember } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Heart, 
  Award, 
  MapPin, 
  Info, 
  Baby, 
  Hourglass, 
  Cake, 
  Users 
} from 'lucide-react';
import { motion } from 'motion/react';

interface LineageStatsProps {
  members: FamilyMember[];
}

export const LineageStats: React.FC<LineageStatsProps> = ({ members }) => {
  // Current reference year for living members
  const REFERENCE_YEAR = 2026;

  // 1. Helper to extract birth and death years robustly
  const getBirthYear = (member: FamilyMember): number | null => {
    if (!member.birthDate) return null;
    const match = member.birthDate.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : null;
  };

  const getDeathYear = (member: FamilyMember): number | null => {
    if (!member.deathDate) return null;
    const match = member.deathDate.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : null;
  };

  // 2. Computed Demographic Calculations
  const stats = useMemo(() => {
    let totalLiving = 0;
    let totalDeceased = 0;
    let livingAgeSum = 0;
    let livingAgeCount = 0;
    let deceasedLifespanSum = 0;
    let deceasedLifespanCount = 0;
    
    // Age bucket counters
    const buckets = {
      'Youth (<20)': { value: 0, color: '#A0B496' },       // Soft Sage green
      'Prime Young (20-39)': { value: 0, color: '#C8A2C8' }, // Soft Lavender
      'Middle Age (40-59)': { value: 0, color: '#D2B48C' },  // Soft Tan
      'Golden Years (60-79)': { value: 0, color: '#E5A93B' },// Soft Ochre golden
      'Centenarians (80+)': { value: 0, color: '#CC6666' },  // Clay/Rust
      'Unknown Reference': { value: 0, color: '#A8A29E' },   // Neutral gray
    };

    // Birth decade index
    const decadeMap: Record<number, { name: string; births: number; living: number; deceased: number }> = {};
    
    // Top locations counter
    const locationMap: Record<string, number> = {};
    // Top occupations counter
    const occupationMap: Record<string, number> = {};

    members.forEach((m) => {
      // Living vs Deceased
      if (m.isDeceased) {
        totalDeceased++;
      } else {
        totalLiving++;
      }

      const bYear = getBirthYear(m);
      const dYear = getDeathYear(m);

      // Lifespans & Ages
      if (bYear !== null) {
        const decade = Math.floor(bYear / 10) * 10;
        if (!decadeMap[decade]) {
          decadeMap[decade] = { name: `${decade}s`, births: 0, living: 0, deceased: 0 };
        }
        decadeMap[decade].births++;
        if (m.isDeceased) {
          decadeMap[decade].deceased++;
        } else {
          decadeMap[decade].living++;
        }

        let age: number | null = null;
        if (m.isDeceased) {
          if (dYear !== null) {
            age = dYear - bYear;
            if (age >= 0) {
              deceasedLifespanSum += age;
              deceasedLifespanCount++;
            }
          }
        } else {
          age = REFERENCE_YEAR - bYear;
          if (age >= 0) {
            livingAgeSum += age;
            livingAgeCount++;
          }
        }

        // Place in age bracket
        if (age !== null && age >= 0) {
          if (age < 20) buckets['Youth (<20)'].value++;
          else if (age < 40) buckets['Prime Young (20-39)'].value++;
          else if (age < 60) buckets['Middle Age (40-59)'].value++;
          else if (age < 80) buckets['Golden Years (60-79)'].value++;
          else buckets['Centenarians (80+)'].value++;
        } else {
          buckets['Unknown Reference'].value++;
        }
      } else {
        buckets['Unknown Reference'].value++;
      }

      // Birth places cataloging
      if (m.birthPlace && m.birthPlace.trim()) {
        const place = m.birthPlace.split(',').pop()?.trim() || m.birthPlace.trim();
        locationMap[place] = (locationMap[place] || 0) + 1;
      }

      // Occupations cataloging
      if (m.occupation && m.occupation.trim()) {
        const occ = m.occupation.trim();
        occupationMap[occ] = (occupationMap[occ] || 0) + 1;
      }
    });

    // Format Pie chart data (only keep buckets with > 0 items)
    const pieData = Object.entries(buckets)
      .map(([name, pack]) => ({
        name,
        value: pack.value,
        color: pack.color,
      }))
      .filter((bucket) => bucket.value > 0);

    // Format Bar chart data (sorted chronologically)
    const barData = Object.keys(decadeMap)
      .map(Number)
      .sort((a, b) => a - b)
      .map((dec) => ({
        decadeValue: dec,
        name: decadeMap[dec].name,
        Births: decadeMap[dec].births,
        Living: decadeMap[dec].living,
        Deceased: decadeMap[dec].deceased,
      }));

    // Format Top Locations
    const topLocations = Object.entries(locationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    // Format Top Occupations
    const topOccupations = Object.entries(occupationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({ name, count }));

    const avgLivingAge = livingAgeCount > 0 ? Math.round(livingAgeSum / livingAgeCount) : null;
    const avgDeceasedLifespan = deceasedLifespanCount > 0 ? Math.round(deceasedLifespanSum / deceasedLifespanCount) : null;

    return {
      totalLiving,
      totalDeceased,
      avgLivingAge,
      avgDeceasedLifespan,
      pieData,
      barData,
      topLocations,
      topOccupations,
    };
  }, [members]);

  const customPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#2D2926] text-white p-3 rounded-lg border border-[#7A7570] text-left text-xs shadow-md font-sans">
          <span className="font-bold uppercase tracking-wider block text-[10px] text-stone-300 font-mono mb-1">
            Age Bracket Profile
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
            <span className="font-semibold">{data.name}:</span>
            <span className="font-mono">{data.value} {data.value === 1 ? 'member' : 'members'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const customBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#2D2926] text-white p-3 rounded-lg border border-[#7A7570] text-left text-xs shadow-md font-sans space-y-1">
          <span className="font-bold uppercase tracking-wider block text-[10px] text-stone-300 font-mono">
            Era Registry: {label}
          </span>
          <div className="flex justify-between gap-4 py-0.5 border-b border-stone-700">
            <span className="text-stone-300">Total Recorded Births:</span>
            <span className="font-mono font-bold text-amber-300">{payload[0].value}</span>
          </div>
          <div className="flex justify-between gap-4 text-[10px]">
            <span className="text-stone-400">Still Active/Living:</span>
            <span className="font-mono text-emerald-400">{payload[0].payload.Living}</span>
          </div>
          <div className="flex justify-between gap-4 text-[10px]">
            <span className="text-stone-400">Deceased Ancestors:</span>
            <span className="font-mono text-stone-400">{payload[0].payload.Deceased}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 flex items-center gap-4 text-left"
        >
          <div className="p-3 bg-white border border-[#E5E1DA] rounded-lg text-[#2D2926]">
            <Users className="w-5 h-5 opacity-80" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7570] uppercase font-mono tracking-wider font-semibold block">Total Linage Cards</span>
            <strong className="text-2xl font-bold font-serif text-[#2D2926] block leading-tight">{members.length}</strong>
            <span className="text-[9px] text-[#A8A29E] font-mono font-medium block mt-0.5">
              {stats.totalLiving} living &bull; {stats.totalDeceased} deceased
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 flex items-center gap-4 text-left"
        >
          <div className="p-3 bg-white border border-[#E5E1DA] rounded-lg text-[#7A7570]">
            <Hourglass className="w-5 h-5 opacity-80" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7570] uppercase font-mono tracking-wider font-semibold block">Ancestral Lifespan</span>
            <strong className="text-2xl font-bold font-serif text-[#2D2926] block leading-tight">
              {stats.avgDeceasedLifespan !== null ? `${stats.avgDeceasedLifespan} yrs` : 'N/A'}
            </strong>
            <span className="text-[9px] text-[#A8A29E] font-mono block mt-0.5">
              Average across historical records
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 flex items-center gap-4 text-left"
        >
          <div className="p-3 bg-white border border-[#E5E1DA] rounded-lg text-amber-600">
            <Cake className="w-5 h-5 opacity-80" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7570] uppercase font-mono tracking-wider font-semibold block">Living Member Age</span>
            <strong className="text-2xl font-bold font-serif text-[#2D2926] block leading-tight">
              {stats.avgLivingAge !== null ? `${stats.avgLivingAge} yrs` : 'N/A'}
            </strong>
            <span className="text-[9px] text-[#A8A29E] font-mono block mt-0.5">
              Ages computed for year {REFERENCE_YEAR}
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 flex items-center gap-4 text-left"
        >
          <div className="p-3 bg-white border border-[#E5E1DA] rounded-lg text-emerald-600">
            <TrendingUp className="w-5 h-5 opacity-80" />
          </div>
          <div>
            <span className="text-[10px] text-[#7A7570] uppercase font-mono tracking-wider font-semibold block">Recorded Eras</span>
            <strong className="text-2xl font-bold font-serif text-[#2D2926] block leading-tight">
              {stats.barData.length} Decades
            </strong>
            <span className="text-[9px] text-[#A8A29E] font-mono block mt-0.5">
              Spanning {stats.barData[0]?.name || 'N/A'} to {stats.barData[stats.barData.length - 1]?.name || 'N/A'}
            </span>
          </div>
        </motion.div>

      </div>

      {/* Main Charts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Age Demographics Pie Card */}
        <div className="border border-[#E5E1DA] bg-white rounded-xl p-5 text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#FAF9F6] text-[#7A7570] tracking-widest font-mono font-bold px-2 py-0.5 rounded border border-[#E5E1DA]">
                DISTRIBUTION
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#2D2926] font-serif">Age Demographics &amp; Brackets</h3>
            <p className="text-[11px] text-[#7A7570] mt-1 leading-relaxed">
              Lifespans of historical ancestors combined with active ages of living descendants.
            </p>
          </div>

          <div className="h-68 my-4 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={customPieTooltip} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Elegant Inner Total Counter */}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-serif font-bold text-[#2D2926]">{members.filter(m => getBirthYear(m) !== null).length}</span>
              <span className="text-[9px] font-mono text-[#7A7570] uppercase font-bold tracking-wider">With Dates</span>
            </div>
          </div>

          {/* Custom Legends list */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#E5E1DA]">
            {stats.pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="min-w-0 flex flex-col">
                  <span className="text-[10px] font-medium text-[#2D2926] truncate leading-none">{item.name}</span>
                  <span className="text-[9px] font-mono text-[#7A7570] block mt-0.5 leading-none">{item.value} {item.value === 1 ? 'person' : 'people'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Birth decade bar chart card */}
        <div className="border border-[#E5E1DA] bg-white rounded-xl p-5 text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-[#FAF9F6] text-[#7A7570] tracking-widest font-mono font-bold px-2 py-0.5 rounded border border-[#E5E1DA]">
                CHRONICLE TIMELINE
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#2D2926] font-serif">Birth Distribution Across Decades</h3>
            <p className="text-[11px] text-[#7A7570] mt-1 leading-relaxed">
              Historical count of registered lineage members categorized by birth decade.
            </p>
          </div>

          <div className="h-68 my-4 flex items-center justify-center">
            {stats.barData.length === 0 ? (
              <div className="text-center space-y-2 py-10">
                <Baby className="w-8 h-8 mx-auto stroke-1.5 text-[#A8A29E]" />
                <p className="text-xs text-[#7A7570] font-sans">No birth dates found in database.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.barData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  barGap={0}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E1DA" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#7A7570', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#E5E1DA"
                  />
                  <YAxis 
                    allowDecimals={false}
                    tick={{ fill: '#7A7570', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="#E5E1DA"
                  />
                  <Tooltip content={customBarTooltip} cursor={{ fill: 'rgba(45, 41, 38, 0.03)' }} />
                  <Bar dataKey="Births" fill="#2D2926" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E1DA] flex items-center justify-between text-[11px] text-[#7A7570]">
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Hover bars to review detailed living vs deceased counts</span>
            </div>
            <span className="font-mono text-[10px] bg-[#FAF9F6] border border-[#E5E1DA] px-2 py-0.5 rounded text-[#7A7570]">
              Bar count = Total Born
            </span>
          </div>
        </div>

      </div>

      {/* Geolocation & Occupation Micro-Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Landmark Birthplaces list */}
        <div className="border border-[#E5E1DA] bg-[#FAF9F6]/50 rounded-xl p-5 text-left">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-[#7A7570]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D2926] font-mono leading-none">
              Top Landmark Birthplaces
            </h4>
          </div>

          {stats.topLocations.length === 0 ? (
            <p className="text-xs text-[#7A7570] py-4">No birthplace locations registered in active profiles.</p>
          ) : (
            <div className="space-y-2">
              {stats.topLocations.map((loc, idx) => (
                <div key={loc.name} className="flex items-center justify-between bg-white border border-[#E5E1DA] p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#FAF9F6] border border-[#E5E1DA] flex items-center justify-center font-mono text-[10px] font-bold text-[#7A7570]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#2D2926] truncate">{loc.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-bold">
                    {loc.count} {loc.count === 1 ? 'record' : 'records'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Traditional & Modern Vocations list */}
        <div className="border border-[#E5E1DA] bg-[#FAF9F6]/50 rounded-xl p-5 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-[#7A7570]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D2926] font-mono leading-none">
              Registered Lineage Occupations
            </h4>
          </div>

          {stats.topOccupations.length === 0 ? (
            <p className="text-xs text-[#7A7570] py-4">No occupations registered in active profiles.</p>
          ) : (
            <div className="space-y-2">
              {stats.topOccupations.map((occ, idx) => (
                <div key={occ.name} className="flex items-center justify-between bg-white border border-[#E5E1DA] p-2.5 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#FAF9F6] border border-[#E5E1DA] flex items-center justify-center font-mono text-[10px] font-bold text-[#7A7570]">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#2D2926] truncate">{occ.name}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-bold">
                    {occ.count} {occ.count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
