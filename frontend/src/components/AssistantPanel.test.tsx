import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { ASSISTANT_STORAGE_KEY, assistantApi } from "../api/assistant";
import { ApiError } from "../api/client";
import type { User } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { AssistantButton } from "./AssistantButton";

afterEach(() => vi.restoreAllMocks());

const sara: User = { id: 3, name: "Sara", email: "sara@test.dev", role: "CUSTOMER" };

const renderButton = (user: User = sara) =>
  render(
    <AuthContext.Provider value={{ user, loading: false, login: vi.fn(), startSession: vi.fn(), logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
      <MemoryRouter>
        <AssistantButton />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const openChat = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Ask the StockFlow assistant" }));
  return screen.findByRole("dialog", { name: "StockFlow assistant" });
};

test("a customer opens the chat, picks a suggested question, and gets an answer with product links", async () => {
  const chat = vi.spyOn(assistantApi, "chat").mockResolvedValue({ reply: "These are on sale: Ballpoint Pens.", products: [{ id: 4, name: "Ballpoint Pens" }] });
  renderButton();
  await openChat();
  expect(screen.getByText("Hi Sara! Ask me about products, prices or your orders.")).toBeInTheDocument();
  // A new customer sees what they can ask: at least 5 questions to click
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getAllByRole("button").length).toBeGreaterThanOrEqual(5 + 2); // (+ ✕ and Send)

  await userEvent.click(screen.getByRole("button", { name: "Which products are on sale?" }));
  expect(await screen.findByText("These are on sale: Ballpoint Pens.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ballpoint Pens →" })).toHaveAttribute("href", "/products/4");
  expect(chat).toHaveBeenCalledWith([{ role: "user", content: "Which products are on sale?" }], "en");
  // Kept while moving between pages
  expect(JSON.parse(sessionStorage.getItem(ASSISTANT_STORAGE_KEY)!)).toHaveLength(2);
});

test("Enter sends the question with the conversation so far; an error shows in the chat", async () => {
  sessionStorage.setItem(
    ASSISTANT_STORAGE_KEY,
    JSON.stringify([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello Sara!" },
    ]),
  );
  const chat = vi
    .spyOn(assistantApi, "chat")
    .mockRejectedValue(new ApiError(503, "ASSISTANT_OFFLINE", "The assistant is not available right now. Please try again later.", []));
  renderButton();
  await openChat();
  expect(screen.getByText("Hello Sara!")).toBeInTheDocument(); // the earlier conversation is back

  await userEvent.type(screen.getByLabelText("Your question"), "Where is my order?{Enter}");
  expect(chat).toHaveBeenCalledWith(
    [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello Sara!" },
      { role: "user", content: "Where is my order?" },
    ],
    "en",
  );
  expect(await screen.findByText("The assistant is not available right now. Please try again later.")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("Your question")).toHaveValue(""));
});

test("admins get questions about the shop, and Escape closes the chat", async () => {
  renderButton({ ...sara, role: "ADMIN", name: "Boss" });
  await openChat();
  expect(screen.getByText("Hi Boss! Ask me about stock, sales or the orders to ship.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Which products need restocking?" })).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
