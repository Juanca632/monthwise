import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** The only confirmations in the contract (FR-032). */
export type ToastMessage = 'Saved' | 'Deleted';

/** The toast on screen; `id` is new for every show, so the same message twice plays twice. */
export type ShownToast = { message: ToastMessage; id: number };

type ToastValue = {
  toast: ShownToast | null;
  show(message: ToastMessage): void;
  /** Called by the toast when its time is up. */
  clear(id: number): void;
};

const ToastContext = createContext<ToastValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ShownToast | null>(null);
  const value = useMemo<ToastValue>(
    () => ({
      toast,
      show: (message) => setToast({ message, id: nextId++ }),
      clear: (id) => setToast((current) => (current?.id === id ? null : current)),
    }),
    [toast],
  );
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/** Outside the provider (a screen rendered on its own, as in tests) showing does nothing. */
export function useToast(): ToastValue {
  return useContext(ToastContext) ?? NO_TOAST;
}

const NO_TOAST: ToastValue = { toast: null, show: () => {}, clear: () => {} };
