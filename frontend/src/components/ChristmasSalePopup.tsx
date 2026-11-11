import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { promotionsApi } from "../api/promotions";
import { AuthContext } from "../auth/authContext";
import { shortDate } from "../utils/format";

const seenKey = (id: number) => `sale-popup-seen-${id}`;

// When a sale is on, visitors and customers see a festive window once per visit (admins don't).
export function ChristmasSalePopup() {
  const user = useContext(AuthContext)?.user;
  const sale = useQuery({ queryKey: ["promotion"], queryFn: promotionsApi.current, staleTime: 60_000 });
  const promo = sale.data;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const mainButton = useRef<HTMLButtonElement>(null);

  // Wait until the 2-second welcome screen has gone, then show it, once per visit.
  useEffect(() => {
    if (!promo || user?.role === "ADMIN" || sessionStorage.getItem(seenKey(promo.id))) return;
    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(seenKey(promo.id), "1");
    }, 2600);
    return () => clearTimeout(timer);
  }, [promo, user?.role]);

  // While open: focus the main button, and Escape closes the window.
  useEffect(() => {
    if (!open) return;
    mainButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !promo) return null;
  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && close()} // click outside = close
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-title"
        className="sale-pop relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-rose-700 px-8 pt-8 pb-10 text-center text-white shadow-2xl"
      >
        <Snow />
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 rounded-full px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
        <div className="relative">
          <div className="text-5xl" aria-hidden="true">
            🎄
          </div>
          <p className="mt-3 text-xs font-semibold tracking-[0.25em] text-amber-200 uppercase">Merry Christmas</p>
          <h2 id="sale-title" className="mt-1 text-3xl font-extrabold">
            {promo.name}
          </h2>
          <p className="mt-4 text-7xl font-black text-amber-300 drop-shadow-lg">-{promo.percent}%</p>
          <p className="mt-2 text-lg text-white/95">on {promo.productCount} selected products</p>
          <p className="mt-1 text-sm text-white/75">Until {shortDate(promo.endsAt)}, while stocks last</p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              ref={mainButton}
              onClick={() => {
                close();
                navigate("/products?sale=1");
              }}
              className="btn w-full max-w-xs bg-white py-3 text-base font-bold text-red-700 shadow-lg hover:bg-amber-50"
            >
              See the deals 🎁
            </button>
            <button onClick={close} className="text-sm text-white/80 hover:text-white hover:underline">
              Maybe later
            </button>
          </div>
        </div>
        {/* A garland of lights along the bottom */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-4 justify-around bg-emerald-800">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={`garland-light mt-1 h-2 w-2 rounded-full ${["bg-amber-300", "bg-red-400", "bg-sky-300"][i % 3]}`}
              style={{ animationDelay: `${(i % 3) * 0.4}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Falling snowflakes: decoration only (hidden from screen readers, and off when animations are off).
export function Snow({ count = 18 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="snowflake"
          style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.7) % 6}s`, animationDuration: `${6 + (i % 5)}s`, fontSize: `${10 + (i % 4) * 4}px` }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
