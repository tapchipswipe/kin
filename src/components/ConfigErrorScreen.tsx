/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings, AlertTriangle } from 'lucide-react';

export function ConfigErrorScreen() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center font-sans tracking-tight px-4">
      <div className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center mx-auto">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[#2D2926] leading-tight">
              Setup Required
            </h1>
            <p className="text-xs text-[#7A7570] mt-1.5 leading-relaxed">
              Supabase environment variables are missing. The app cannot connect to your database
              until they are configured.
            </p>
          </div>
        </div>

        <div className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 space-y-3 text-xs text-left">
          <p className="font-bold text-[#2D2926] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Add these in Vercel (or .env.local for dev):
          </p>
          <ul className="font-mono text-[#7A7570] space-y-1.5 pl-1">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-[#7A7570] leading-relaxed pt-1">
            If using the Vercel Supabase integration, map{' '}
            <code className="text-[10px] bg-white px-1 py-0.5 rounded border">NEXT_PUBLIC_SUPABASE_*</code>{' '}
            to the VITE_ names, then redeploy.
          </p>
        </div>
      </div>
    </div>
  );
}
