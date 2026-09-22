"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, Check, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TONES: Record<ToastType, { border: string; accent: string; icon: React.ReactNode }> = {
  success: {
    border: "border-verified/35",
    accent: "bg-verified",
    icon: <Check className="h-4 w-4 text-verified" />,
  },
  error: {
    border: "border-breach/35",
    accent: "bg-breach",
    icon: <XCircle className="h-4 w-4 text-breach" />,
  },
  warning: {
    border: "border-copper/40",
    accent: "bg-copper",
    icon: <AlertTriangle className="h-4 w-4 text-copper" />,
  },
  info: {
    border: "border-edge-strong",
    accent: "bg-signal",
    icon: <Info className="h-4 w-4 text-signal" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", title?: string) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextType>(
    () => ({
      toast: addToast,
      success: (m, t) => addToast(m, "success", t),
      error: (m, t) => addToast(m, "error", t),
      warning: (m, t) => addToast(m, "warning", t),
      info: (m, t) => addToast(m, "info", t),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = TONES[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-md border ${tone.border} bg-board/95 py-3.5 pl-4 pr-3 shadow-lift backdrop-blur-md`}
              >
                {/* Status bar down the leading edge, the way a rack unit
                    signals which channel lit up. */}
                <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${tone.accent}`} />

                <span className="mt-px shrink-0">{tone.icon}</span>

                <div className="flex-1">
                  {t.title && (
                    <div className="font-display text-[13px] font-semibold text-foreground">
                      {t.title}
                    </div>
                  )}
                  <div className="text-[13px] leading-snug text-muted-foreground">
                    {t.message}
                  </div>
                </div>

                <button
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
