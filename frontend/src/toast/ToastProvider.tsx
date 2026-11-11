import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastKind } from "./toastContext";

type Toast = { id: number; message: string; kind: ToastKind };

const looks: Record<ToastKind, { icon: string; color: string }> = {
  success: { icon: "✓", color: "bg-success-500" },
  error: { icon: "!", color: "bg-danger-500" },
  info: { icon: "i", color: "bg-brand-500" },
};

// Small messages that pop up in the bottom-right corner ("Added to cart", "Order placed", ...)
// and disappear by themselves after a few seconds.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-2), { id, message, kind }]); // at most 3 at a time
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: screen readers read new messages out loud */}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  // Errors stay a bit longer, so there is time to read them.
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), toast.kind === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const { icon, color } = looks[toast.kind];
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}>
        {icon}
      </span>
      <p className="flex-1">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} aria-label="Close message" className="text-slate-400 hover:text-white">
        ✕
      </button>
    </div>
  );
}
