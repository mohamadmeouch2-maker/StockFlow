import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "../api/client";
import { issueLabel, issuesApi, ISSUE_TYPES } from "../api/issues";
import type { IssueType, OrderIssue } from "../api/types";

// Under each order in "My orders": the problems reported so far, the store's replies,
// and a "Report a problem" button with a short form.
export function OrderProblems({ orderId, issues }: { orderId: number; issues: OrderIssue[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<IssueType>("WRONG_ITEM");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const send = useMutation({
    mutationFn: () => issuesApi.report(orderId, { type, message: message.trim() }),
    onSuccess: () => {
      setOpen(false);
      setMessage("");
      qc.invalidateQueries({ queryKey: ["orders", "mine"] });
    },
    onError: (err) => setError(err instanceof ApiError && err.details[0] ? err.details[0].message : err.message),
  });

  const submit = () => {
    setError("");
    if (message.trim().length < 10) return setError("Please describe the problem (at least 10 characters)");
    send.mutate();
  };

  const hasOpen = issues.some((i) => i.status === "OPEN");

  return (
    <div className="space-y-3 border-t border-slate-100 px-5 py-3">
      {issues.map((i) => (
        <div key={i.id} className={`rounded-lg p-3 text-sm ${i.status === "OPEN" ? "bg-amber-50" : "bg-emerald-50"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">⚠️ Problem reported: {issueLabel(i.type)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {i.status === "OPEN" ? "Waiting for an answer" : "Resolved"}
            </span>
            <span className="ml-auto text-xs text-slate-500">{new Date(i.createdAt).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-slate-700">“{i.message}”</p>
          {i.adminReply && (
            <p className="mt-2 rounded-md bg-white p-2 text-slate-700">
              <span className="font-semibold text-blue-700">Reply from StockFlow:</span> {i.adminReply}
            </p>
          )}
        </div>
      ))}

      {!open && !hasOpen && (
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-slate-600 hover:text-blue-700">
          Something wrong with this order? <span className="underline">Report a problem</span>
        </button>
      )}

      {open && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Report a problem with order #{orderId}</p>
          <div>
            <label htmlFor={`issue-type-${orderId}`} className="label">
              What went wrong?
            </label>
            <select id={`issue-type-${orderId}`} value={type} onChange={(e) => setType(e.target.value as IssueType)} className="input">
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`issue-message-${orderId}`} className="label">
              Tell us more
            </label>
            <textarea
              id={`issue-message-${orderId}`}
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="For example: the stapler arrived broken."
              className="input"
            />
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex gap-2">
            <button disabled={send.isPending} onClick={submit} className="btn btn-primary">
              {send.isPending ? "Sending..." : "Send report"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
