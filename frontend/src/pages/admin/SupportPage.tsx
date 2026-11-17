import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supportApi } from "../../api/support";
import type { SupportStatus } from "../../api/types";
import { RowsSkeleton } from "../../components/Skeleton";
import { SupportConversation } from "../../components/SupportConversation";

const filters: { value?: SupportStatus; label: string }[] = [
  { value: "OPEN", label: "Waiting for us" },
  { value: "ANSWERED", label: "Answered" },
  { value: "RESOLVED", label: "Solved" },
  { value: undefined, label: "All" },
];

// Admin: Customer service. Messages from customers and visitors (signing in, orders, delivery, returns,
// payments and cards, changes). Answer them here; the customer also gets the answer by email.
export function SupportPage() {
  const [status, setStatus] = useState<SupportStatus | undefined>("OPEN");
  // The same query as the number in the menu (["support", "OPEN"]), so both stay in step
  const tickets = useQuery({ queryKey: ["support", status ?? "ALL"], queryFn: () => supportApi.all(status) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Customer service</h1>
          <p className="text-sm text-slate-500">Messages from customers and visitors. Answer them here: they also get your answer by email.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {filters.map((f) => (
            <button
              key={f.label}
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                status === f.value ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {tickets.isLoading && <RowsSkeleton rows={3} />}
      {tickets.isError && <p className="text-danger-600">Could not load the messages. {tickets.error.message}</p>}
      {tickets.data?.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">{status === "OPEN" ? "Nobody is waiting for an answer 🎉" : "No messages here."}</p>
          <p className="text-sm">When a customer or a visitor writes to Customer service, the message appears here.</p>
        </div>
      )}

      {tickets.data?.map((t) => (
        <SupportConversation key={t.id} ticket={t} viewer="STAFF" />
      ))}
    </div>
  );
}
