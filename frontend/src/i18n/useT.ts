import { useContext } from "react";
import { I18nContext } from "./i18nContext";

// const { t, lang } = useT();   t("Log in")   t("Welcome back, {name}!", { name })
// Using it also makes the component show the new language as soon as it is chosen.
export const useT = () => useContext(I18nContext);
