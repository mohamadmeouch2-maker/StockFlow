import { useT } from "../i18n/useT";
import { useInstallApp } from "../pwa/installApp";

// "Install the app" in the ☰ menu: StockFlow gets its own icon and window, like a program.
// Only shown when the browser can install it (Chrome or Edge, and not installed yet).
export function InstallAppButton({ onDone }: { onDone?: () => void }) {
  const { t } = useT();
  const { canInstall, install } = useInstallApp();
  if (!canInstall) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onDone?.(); // close the menu: the browser's question shows over the page
        void install();
      }}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M12 7v7m-3-3 3 3 3-3M10 18h4" />
      </svg>
      {t("Install the app")}
    </button>
  );
}
