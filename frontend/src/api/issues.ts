import { api } from "./client";
import type { IssueStatus, IssueType, OrderIssue } from "./types";

export const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "DAMAGED", label: "Damaged item" },
  { value: "MISSING_ITEM", label: "Missing item" },
  { value: "LATE_DELIVERY", label: "Late delivery" },
  { value: "OTHER", label: "Other problem" },
];
export const issueLabel = (type: IssueType) => ISSUE_TYPES.find((t) => t.value === type)?.label ?? type;

// Problems with orders: the customer reports, the admin answers.
export const issuesApi = {
  report: (orderId: number, body: { type: IssueType; message: string }) =>
    api<OrderIssue>("core", `/api/orders/${orderId}/issues`, { method: "POST", body: JSON.stringify(body) }),
  mine: () => api<OrderIssue[]>("core", "/api/issues/mine"),
  // Admin only
  all: (status?: IssueStatus) => api<OrderIssue[]>("core", `/api/issues${status ? `?status=${status}` : ""}`),
  update: (id: number, body: { reply?: string; status?: IssueStatus }) =>
    api<OrderIssue>("core", `/api/issues/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
