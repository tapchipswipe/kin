/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

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
  const confirmRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  useEffect(() => {
    if (!confirmState) return;
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        confirmState.resolve(false);
        setConfirmState(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState]);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <AppDialogContext.Provider value={{ toast, confirm }}>
      {children}

      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-md"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`senior-toast flex items-start gap-3 px-5 py-4 rounded-xl border shadow-lg text-base font-medium ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : t.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-white border-[#E5E1DA] text-[#2D2926]'
              }`}
            >
              {t.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      )}

      {confirmState && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="presentation"
          onClick={() => handleConfirm(false)}
        >
          <div
            ref={confirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="bg-white rounded-xl border border-[#E5E1DA] shadow-lg max-w-md w-full p-6 space-y-5 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="confirm-dialog-title" className="text-base text-[#2D2926] leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                ref={cancelRef}
                onClick={() => handleConfirm(false)}
                className="min-h-[48px] px-5 py-2 border border-[#E5E1DA] rounded-lg text-base font-bold text-[#2D2926] hover:bg-[#FAF9F6] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="min-h-[48px] px-5 py-2 bg-[#2D2926] text-white rounded-lg text-base font-bold hover:bg-[#1C1A18] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2"
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
