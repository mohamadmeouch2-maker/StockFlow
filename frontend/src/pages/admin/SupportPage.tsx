import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { issueLabel, issuesApi } from "../../api/issues";
import type { IssueStatus, OrderIssue } from "../../api/types";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";
import { RowsSkeleton } from "../../components/Skeleton";
import { useToast } from "../../toast/useToast";

const filters: { value?: IssueStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: undefined, label: "All" },
];

// Admin: problems customers reported with their orders. Reply and resolve them.
export function SupportPage() {
  const [status, setStatus] = useState<IssueStatus | undefined>("OPEN");
  const issues = useQuery({ queryKey: ["issues", status ?? "ALL"], queryFn: () => issuesApi.all(status) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="text-sm text-slate-500">Problems customers reported with their orders. Open ones come first.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Filter by status">
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

      {issues.isLoading && <RowsSkeleton rows={3} />}
      {issues.isError && <p className="text-danger-600">Could not load the reports. {issues.error.message}</p>}
      {issues.data?.length === 0 && (
        <div className="card p-10 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">{status === "OPEN" ? "No open problems 🎉" : "No reports."}</p>
          <p className="text-sm">When a customer reports a problem with an order, it appears here.</p>
        </div>
      )}

      {issues.data?.map((i) => (
        <IssueCard key={i.id} issue={i} />
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: OrderIssue }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reply, setReply] = useState(issue.adminReply ?? "");

  const update = useMutation({
    mutationFn: (body: { reply?: string; status?: IssueStatus }) => issuesApi.update(issue.id, body),
    onSuccess: (_, body) => {
      toast(body.status === "RESOLVED" ? "Reply sent. The problem is resolved." : body.status === "OPEN" ? "Problem reopened" : "Reply saved");
      qc.invalidateQueries({ queryKey: ["issues"] });
    },
  });

  const open = issue.status === "OPEN";
  const order = issue.order;

  return (
    <div className={`card overflow-hidden ${open ? "border-l-4 border-l-warning-400" : ""}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm">
        <span className="font-semibold text-slate-900">{issueLabel(issue.type)}</span>
        <span className={`badge ${open ? "badge-warning" : "badge-success"}`}>{open ? "Open" : "Resolved"}</span>
        <span className="text-slate-500">
          Order #{issue.orderId} · {issue.user?.name} ({issue.user?.email})
        </span>
        <span className="ml-auto text-xs text-slate-500">{new Date(issue.createdAt).toLocaleString()}</span>
      </div>

      <div className="space-y-3 px-5 py-4 text-sm">
        <p className="text-base text-slate-800">“{issue.message}”</p>
        {order && (
          <div className="flex flex-wrap items-center gap-2 text-slate-500">
            <OrderStatusBadge status={order.status} />
            <span>{order.items.map((it) => `${it.quantity} × ${it.product.name}`).join(", ")}</span>
            <span>· ${Number(order.total).toFixed(2)}</span>
          </div>
        )}

        <div>
          <label htmlFor={`reply-${issue.id}`} className="label">
            Reply to the customer
          </label>
          <textarea
            id={`reply-${issue.id}`}
            rows={2}
            maxLength={1000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="For example: Sorry about that! We are sending a replacement today."
            className="input"
          />
        </div>
        {update.isError && <p className="field-error">Could not save. {update.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          {open ? (
            <>
              <button
                disabled={update.isPending || !reply.trim()}
                onClick={() => update.mutate({ reply: reply.trim(), status: "RESOLVED" })}
                className="btn btn-primary"
              >
                Send reply & resolve
              </button>
              <button disabled={update.isPending || !reply.trim()} onClick={() => update.mutate({ reply: reply.trim() })} className="btn btn-outline">
                Send reply only
              </button>
            </>
          ) : (
            <>
              <button disabled={update.isPending || !reply.trim()} onClick={() => update.mutate({ reply: reply.trim() })} className="btn btn-outline">
                Update reply
              </button>
              <button disabled={update.isPending} onClick={() => update.mutate({ status: "OPEN" })} className="btn btn-outline">
                Reopen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
