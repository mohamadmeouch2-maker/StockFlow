import { createContext } from "react";
import { t, type Lang } from "./core";

export type I18nState = {
  lang: Lang;
  dir: "ltr" | "rtl"; // Arabic is written right to left
  locale: string; // for dates, e.g. "fr-FR"
  t: typeof t;
  setLang: (lang: Lang) => void;
};

// Outside I18nProvider (e.g. in tests) everything is in English.
export const I18nContext = createContext<I18nState>({ lang: "en", dir: "ltr", locale: "en-US", t, setLang: () => {} });
