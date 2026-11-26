import { useT } from "../i18n/useT";
import { useTheme } from "../theme/theme";

// The 🌙 / ☀️ button next to the language: dark mode on or off. The choice is remembered.
export function ThemeToggle() {
  const { t } = useT();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      title={t("Dark mode")}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      {dark ? (
        // a sun: press it to go back to light
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // a moon
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      )}
      {/* The name shows in the ☰ menu (on a phone); in the top bar only the icon */}
      <span className="md:sr-only">{t("Dark mode")}</span>
    </button>
  );
}
