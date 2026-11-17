import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { supportApi } from "../../api/support";
import type { SupportTicket } from "../../api/types";
import { SupportPage } from "./SupportPage";

afterEach(() => vi.restoreAllMocks());

const visitorTicket: SupportTicket = {
  id: 9,
  userId: null,
  name: "Nadia",
  email: "nadia@mail.dev",
  topic: "SIGN_IN",
  orderId: null,
  status: "OPEN",
  customerUnread: false,
  createdAt: "2026-11-17T09:00:00Z",
  updatedAt: "2026-11-17T09:00:00Z",
  messages: [{ id: 1, author: "CUSTOMER", body: "I can't log in to my account.", createdAt: "2026-11-17T09:00:00Z" }],
  order: null,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SupportPage />
    </QueryClientProvider>,
  );

test("the admin sees who is waiting, answers, and can send and mark solved at once", async () => {
  const all = vi.spyOn(supportApi, "all").mockResolvedValue([visitorTicket]);
  const reply = vi.spyOn(supportApi, "reply").mockResolvedValue({ ...visitorTicket, status: "RESOLVED" });
  renderPage();
  expect(all).toHaveBeenCalledWith("OPEN"); // "Waiting for us" first
  const conversation = await screen.findByRole("article", { name: "Signing in and my account" });
  expect(within(conversation).getByText("Visitor, not logged in")).toBeInTheDocument();
  expect(within(conversation).getByRole("link", { name: "nadia@mail.dev" })).toHaveAttribute("href", "mailto:nadia@mail.dev");
  expect(within(conversation).getByText("Waiting for us")).toBeInTheDocument();

  const send = within(conversation).getByRole("button", { name: "Send & mark solved" });
  expect(send).toBeDisabled(); // nothing written yet
  await userEvent.type(within(conversation).getByLabelText("Answer the customer"), "Use Forgot password? on the login page.");
  await userEvent.click(send);
  expect(reply).toHaveBeenCalledWith(9, "Use Forgot password? on the login page.", true);
});

test("Mark solved works without writing, and the filters ask for other conversations", async () => {
  const all = vi.spyOn(supportApi, "all").mockResolvedValue([visitorTicket]);
  const setStatus = vi.spyOn(supportApi, "setStatus").mockResolvedValue({ ...visitorTicket, status: "RESOLVED" });
  renderPage();
  await userEvent.click(await screen.findByRole("button", { name: "Mark solved" }));
  expect(setStatus).toHaveBeenCalledWith(9, "RESOLVED");

  all.mockResolvedValue([]);
  await userEvent.click(screen.getByRole("button", { name: "Solved" }));
  expect(all).toHaveBeenLastCalledWith("RESOLVED");
  expect(await screen.findByText("No messages here.")).toBeInTheDocument();
});
