import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { issuesApi } from "../api/issues";
import type { OrderIssue } from "../api/types";
import { OrderProblems } from "./OrderProblems";

const report = vi.spyOn(issuesApi, "report").mockResolvedValue({} as never);

const renderBox = (issues: OrderIssue[] = []) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderProblems orderId={5} issues={issues} />
    </QueryClientProvider>,
  );

test("a customer reports a problem with an order", async () => {
  renderBox();
  await userEvent.click(screen.getByText("Report a problem"));
  await userEvent.selectOptions(screen.getByLabelText("What went wrong?"), "DAMAGED");

  await userEvent.type(screen.getByLabelText("Tell us more"), "Broken");
  await userEvent.click(screen.getByRole("button", { name: "Send report" }));
  expect(screen.getByText("Please describe the problem (at least 10 characters)")).toBeInTheDocument();
  expect(report).not.toHaveBeenCalled();

  await userEvent.type(screen.getByLabelText("Tell us more"), " in two pieces");
  await userEvent.click(screen.getByRole("button", { name: "Send report" }));
  await vi.waitFor(() => expect(report).toHaveBeenCalledWith(5, { type: "DAMAGED", message: "Broken in two pieces" }));
});

test("shows the store's reply, and no new report while one is still open", () => {
  const base = { orderId: 5, type: "DAMAGED", message: "Broken in two pieces", createdAt: "2026-11-06T10:00:00Z", updatedAt: "2026-11-06T10:00:00Z" } as const;
  renderBox([
    { ...base, id: 2, status: "OPEN", adminReply: null },
    { ...base, id: 1, status: "RESOLVED", adminReply: "A new one is on its way." },
  ]);
  expect(screen.getByText("Waiting for an answer")).toBeInTheDocument();
  expect(screen.getByText("A new one is on its way.")).toBeInTheDocument();
  expect(screen.queryByText("Report a problem")).not.toBeInTheDocument();
});
