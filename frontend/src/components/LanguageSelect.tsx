import { LANGUAGES, type Lang } from "../i18n/core";
import { useT } from "../i18n/useT";

// The language button in the top bar: English, العربية, Français. The choice is remembered.
export function LanguageSelect() {
  const { lang, setLang, t } = useT();
  return (
    <label className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9Z" />
      </svg>
      <span className="sr-only">{t("Language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="cursor-pointer bg-transparent py-1 font-medium text-slate-700 outline-none"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
