import { useSyncExternalStore } from "react";

// Installing StockFlow as an app (its own icon and window, see public/manifest.webmanifest).
// Chrome and Edge tell the page when the website can be installed ("beforeinstallprompt"):
// we keep that offer for our own "Install the app" button in the ☰ menu. When the app is
// already installed, or the browser can't install websites (Firefox, iPhone), there is no
// offer and the button stays hidden.

type InstallOffer = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let offer: InstallOffer | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

// Listened to as soon as the website starts (main.tsx imports this file), because the browser
// can make its offer before the menu is ever opened.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // no install banner from the browser: the button is enough
  offer = event as InstallOffer;
  changed();
});
window.addEventListener("appinstalled", () => {
  offer = null; // installed: the button goes away
  changed();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// canInstall: show the button. install(): the browser asks "Install StockFlow?".
export function useInstallApp() {
  const canInstall = useSyncExternalStore(subscribe, () => offer !== null);
  const install = async () => {
    if (!offer) return;
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    if (outcome === "accepted") {
      offer = null; // an offer can only be used once
      changed();
    }
  };
  return { canInstall, install };
}

// The helper that shows a friendly page when the website can't be reached (public/sw.js).
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // not supported here (e.g. a private window): the website works the same without it
      });
    });
  }
}
