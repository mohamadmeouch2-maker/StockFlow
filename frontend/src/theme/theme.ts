import { useSyncExternalStore } from "react";

// Light or dark mode. The <html> element carries it (data-theme="dark"), and index.css
// gives every colour its dark version there. index.html sets it before the page shows,
// so a dark page never flashes white first.
//   - The user's choice (the 🌙 / ☀️ button) is remembered in localStorage "theme".
//   - Without a choice, the website follows the computer's or phone's setting, also when it changes.
export type Theme = "light" | "dark";

export const THEME_KEY = "theme";
const listeners = new Set<() => void>();

const saved = (): Theme | null => {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage blocked: follow the system
  }
};
const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

export const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

// The app's title bar (when installed) has the colour of the top bar: white, or the dark card colour
const TITLE_BAR = { light: "#ffffff", dark: "#11192a" };

function apply(theme: Theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", TITLE_BAR[theme]);
  listeners.forEach((listener) => listener());
}

// The user picked light or dark: show it and remember it.
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // not remembered, but it still changes now
  }
  apply(theme);
}

// When the page opens (index.html did this already; this also covers tests)
apply(saved() ?? (systemDark() ? "dark" : "light"));
// The system setting changed (e.g. the phone turned dark at night): follow it, unless the user chose
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", (e) => {
  if (!saved()) apply(e.matches ? "dark" : "light");
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// The theme now, and a way to change it. Components using it redraw when it changes.
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
