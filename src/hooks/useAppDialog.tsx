/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface AppDialogContextValue {
  toast: (message: string, type?: Toast['type']) => void;
  confirm: (message: string) => Promise<boolean>;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <AppDialogContext.Provider value={{ toast, confirm }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium animate-fadeIn ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : t.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-white border-[#E5E1DA] text-[#2D2926]'
              }`}
            >
              {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E1DA] shadow-lg max-w-sm w-full p-6 space-y-4 text-left">
            <p className="text-sm text-[#2D2926] leading-relaxed">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 border border-[#E5E1DA] rounded-lg text-xs font-bold text-[#2D2926] hover:bg-[#FAF9F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="px-4 py-2 bg-[#2D2926] text-white rounded-lg text-xs font-bold hover:bg-[#1C1A18] cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error('useAppDialog must be used within AppDialogProvider');
  return ctx;
}
