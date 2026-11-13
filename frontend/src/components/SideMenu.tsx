import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoMark } from "./Logo";

type Props = { open: boolean; onClose: () => void; children: ReactNode };

// The menu that slides in from the left when ☰ is clicked. The page links are inside (see Layout).
// It closes with ✕, the Escape key, a click outside it, or a click on a link.
// While it is open the page behind it can't scroll, and Tab stays inside the menu (Layout makes the page `inert`).
export function SideMenu({ open, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null; // the ☰ button: the focus goes back to it on close
    panel.current?.querySelector<HTMLElement>("nav a")?.focus(); // keyboard users start on the first link
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [open, onClose]);

  return (
    // Always in the page, so it can slide in and out. `inert` while closed: hidden links can't be reached with Tab.
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} inert={!open}>
      {/* The dark layer behind the menu: a click on it closes the menu */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panel}
        id="side-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // A click on any link inside closes the menu (also a link to the page that is already open)
        onClick={(e) => (e.target as HTMLElement).closest("a") && onClose()}
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 motion-reduce:transition-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <LogoMark className="h-8 w-8" />
            <span>
              Stock<span className="text-brand-600">Flow</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
          {children}
        </nav>
      </div>
    </div>
  );
}
