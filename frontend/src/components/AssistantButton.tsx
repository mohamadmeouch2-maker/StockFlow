import { lazy, Suspense, useState } from "react";
import { useT } from "../i18n/useT";

// The chat window is downloaded the first time it is opened.
const AssistantPanel = lazy(() => import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })));

// The 💬 button in the bottom corner (logged-in users): opens the StockFlow assistant.
export function AssistantButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t("Close the assistant") : t("Ask the StockFlow assistant")}
        title={t("Ask the StockFlow assistant")}
        className="fixed start-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg transition hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-300"
      >
        <span aria-hidden="true">{open ? "✕" : "💬"}</span>
      </button>
    </>
  );
}
