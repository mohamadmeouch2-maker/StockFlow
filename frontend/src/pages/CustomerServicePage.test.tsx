import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "../api/client";
import { ordersApi } from "../api/orders";
import { supportApi } from "../api/support";
import type { Order, SupportTicket, User } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { CustomerServicePage } from "./CustomerServicePage";

afterEach(() => vi.restoreAllMocks());

const sara: User = { id: 3, name: "Sara", email: "sara@test.dev", role: "CUSTOMER" };
const ticket = (over: Partial<SupportTicket> = {}): SupportTicket => ({
  id: 5,
  userId: 3,
  name: "Sara",
  email: "sara@test.dev",
  topic: "DELIVERY",
  orderId: 12,
  status: "ANSWERED",
  customerUnread: false,
  createdAt: "2026-11-17T09:00:00Z",
  updatedAt: "2026-11-17T10:00:00Z",
  messages: [
    { id: 1, author: "CUSTOMER", body: "When will my order arrive?", createdAt: "2026-11-17T09:00:00Z" },
    { id: 2, author: "STAFF", body: "It ships tomorrow morning.", createdAt: "2026-11-17T10:00:00Z" },
  ],
  order: null,
  ...over,
});

const visit = (user: User | null, url = "/help") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user, loading: false, login: vi.fn(), startSession: vi.fn(), logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
        <MemoryRouter initialEntries={[url]}>
          <CustomerServicePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

test("a visitor who can't sign in writes with a name and an email, and is told where the answer goes", async () => {
  const create = vi.spyOn(supportApi, "create").mockResolvedValue(ticket({ userId: null, name: "Nadia", email: "nadia@mail.dev", topic: "SIGN_IN" }));
  visit(null);
  expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password"); // a quick answer first

  await userEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(screen.getByText("Choose a topic")).toBeInTheDocument();
  expect(screen.getByText("At least 2 characters")).toBeInTheDocument();
  expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();

  await userEvent.selectOptions(screen.getByLabelText("Topic"), "Signing in and my account");
  expect(screen.getByLabelText("Message")).toHaveAttribute("placeholder", "For example: I can't log in, or the email code didn't arrive.");
  await userEvent.type(screen.getByLabelText("Your name"), "Nadia");
  await userEvent.type(screen.getByLabelText("Your email"), "Nadia@Mail.dev");
  await userEvent.type(screen.getByLabelText("Message"), "I can't log in to my account.");
  await userEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(create).toHaveBeenCalledWith({ topic: "SIGN_IN", message: "I can't log in to my account.", name: "Nadia", email: "nadia@mail.dev" });
  expect(await screen.findByText("Thanks, Nadia! We got your message.")).toBeInTheDocument();
  expect(screen.getByText("nadia@mail.dev")).toBeInTheDocument();
});

test("from My orders, the topic and the order are already chosen", async () => {
  vi.spyOn(ordersApi, "mine").mockResolvedValue([{ id: 12, status: "PENDING", total: "12.50", createdAt: "2026-11-16T10:00:00Z" } as Order]);
  vi.spyOn(supportApi, "mine").mockResolvedValue([]);
  const create = vi.spyOn(supportApi, "create").mockResolvedValue(ticket({ status: "OPEN" }));
  visit(sara, "/help?topic=ORDER&order=12");
  expect(screen.queryByLabelText("Your email")).not.toBeInTheDocument(); // customers don't type their name and email
  expect(await screen.findByLabelText("Order (optional)")).toHaveValue("12");
  expect(screen.getByLabelText("Topic")).toHaveValue("ORDER");
  await userEvent.type(screen.getByLabelText("Message"), "One pen is missing from the box.");
  await userEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(create).toHaveBeenCalledWith({ topic: "ORDER", message: "One pen is missing from the box.", orderId: 12 });
  expect(await screen.findByLabelText("Message")).toHaveValue(""); // ready for another message
});

test("a server message for a field shows under that field", async () => {
  vi.spyOn(ordersApi, "mine").mockResolvedValue([]);
  vi.spyOn(supportApi, "mine").mockResolvedValue([]);
  vi.spyOn(supportApi, "create").mockRejectedValue(
    new ApiError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "message", message: "At most 2000 characters" }]),
  );
  visit(sara);
  await userEvent.selectOptions(screen.getByLabelText("Topic"), "Returns");
  await userEvent.type(screen.getByLabelText("Message"), "I want to send a chair back.");
  await userEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByText("At most 2000 characters")).toBeInTheDocument();
});

test("My messages: a new answer is marked and reported as seen, and I can write back", async () => {
  vi.spyOn(ordersApi, "mine").mockResolvedValue([]);
  const mine = vi
    .spyOn(supportApi, "mine")
    .mockResolvedValueOnce([ticket({ customerUnread: true })])
    .mockResolvedValue([ticket()]);
  const markRead = vi.spyOn(supportApi, "markRead").mockResolvedValue();
  const reply = vi.spyOn(supportApi, "reply").mockResolvedValue(ticket({ status: "OPEN" }));
  visit(sara);

  const conversation = await screen.findByRole("article", { name: "Delivery, order #12" });
  expect(within(conversation).getByText("New reply")).toBeInTheDocument();
  expect(within(conversation).getByText("It ships tomorrow morning.")).toBeInTheDocument();
  expect(within(conversation).getByText("We answered")).toBeInTheDocument();
  await vi.waitFor(() => expect(markRead).toHaveBeenCalled());
  await vi.waitFor(() => expect(mine).toHaveBeenCalledTimes(2)); // asked again: the number on the menu goes away
  expect(within(conversation).getByText("New reply")).toBeInTheDocument(); // still marked while the page is open

  await userEvent.type(within(conversation).getByLabelText("Write a reply"), "Thank you!");
  await userEvent.click(within(conversation).getByRole("button", { name: "Send" }));
  expect(reply).toHaveBeenCalledWith(5, "Thank you!", undefined);
});

test("admins are sent to their own Customer service page", () => {
  visit({ ...sara, role: "ADMIN" });
  expect(screen.getByRole("link", { name: "Open the customers' messages" })).toHaveAttribute("href", "/admin/support");
  expect(screen.queryByRole("button", { name: "Send message" })).not.toBeInTheDocument();
});
