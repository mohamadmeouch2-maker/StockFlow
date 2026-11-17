import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { languageOf, setDictionary, t, type Dictionary, type Lang } from "./core";
import { I18nContext } from "./i18nContext";

const STORAGE_KEY = "lang";

// The Arabic and French dictionaries are separate files, downloaded only when chosen.
const dictionaries: Record<Exclude<Lang, "en">, () => Promise<Dictionary>> = {
  ar: () => import("./ar").then((m) => m.arabic),
  fr: () => import("./fr").then((m) => m.french),
};

// The language chosen last time on this browser, or else the browser's own language if we have it.
function startLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ar" || saved === "fr") return saved;
  } catch {
    // private mode or blocked storage: just use the browser's language
  }
  const browser = navigator.language.slice(0, 2);
  return browser === "ar" || browser === "fr" ? browser : "en";
}

// Keeps the chosen language for the whole website, and tells the browser about it:
// <html lang="ar" dir="rtl"> makes Arabic pages read from right to left.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const wanted = useRef<Lang>("en"); // the last choice, if two are made quickly one after the other

  const setLang = useCallback(async (next: Lang) => {
    wanted.current = next;
    const dict = next === "en" ? {} : await dictionaries[next]().catch(() => null);
    if (dict === null || wanted.current !== next) return; // could not download it (offline), or another choice came later
    setDictionary(next, dict);
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not remembered, but the page still changes
    }
  }, []);

  useEffect(() => {
    const start = startLanguage();
    if (start !== "en") setLang(start);
  }, [setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = languageOf(lang).dir;
  }, [lang]);

  const value = useMemo(() => ({ lang, dir: languageOf(lang).dir, locale: languageOf(lang).locale, t, setLang }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
