import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

export const SHOW_MS = 2000; // how long the logo stays
export const FADE_MS = 400; // then it fades out

// The welcome screen with the logo, shown every time the website is opened (or refreshed).
// The pages already load behind it, so no time is lost.
export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show");

  useEffect(() => {
    const fade = setTimeout(() => setPhase("fade"), SHOW_MS);
    const done = setTimeout(() => setPhase("done"), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      role="status"
      aria-label="StockFlow is starting"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white transition-opacity duration-[400ms] ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
    >
      <LogoMark className="splash-pop h-24 w-24" />
      <p className="splash-pop text-3xl font-bold text-slate-900">
        Stock<span className="text-blue-600">Flow</span>
      </p>
      <p className="text-sm text-slate-500">Inventory and orders, made simple</p>
    </div>
  );
}
