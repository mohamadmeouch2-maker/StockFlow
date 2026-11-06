import { createContext } from "react";

export type ToastKind = "success" | "error" | "info";
export type ShowToast = (message: string, kind?: ToastKind) => void;

// Outside a ToastProvider (for example in a component test) toasts are simply not shown.
export const ToastContext = createContext<ShowToast>(() => {});
