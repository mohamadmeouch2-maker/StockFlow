import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import type { Session } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { VerifyEmailPage } from "./VerifyEmailPage";

const startSession = vi.fn();
const session: Session = { token: "t0k3n", user: { id: 7, name: "Maya", email: "maya@test.dev", role: "CUSTOMER" } };

const visit = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), startSession, logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/products" element={<p>Products page</p>} />
            <Route path="/register" element={<p>Register page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

test("the right code logs me in and opens the products", async () => {
  const verifyEmail = vi.spyOn(authApi, "verifyEmail").mockResolvedValue(session);
  visit("/verify-email?email=maya%40test.dev&sent=1");
  expect(screen.getByText("maya@test.dev")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Code"), "482 913"); // pasted with a space
  expect(screen.getByLabelText("Code")).toHaveValue("482913");
  await userEvent.click(screen.getByRole("button", { name: "Verify email" }));
  expect(verifyEmail).toHaveBeenCalledWith("maya@test.dev", "482913");
  expect(await screen.findByText("Products page")).toBeInTheDocument();
  expect(startSession).toHaveBeenCalledWith(session);
});

test("a short or wrong code shows a message", async () => {
  const verifyEmail = vi
    .spyOn(authApi, "verifyEmail")
    .mockRejectedValue(
      new ApiError(400, "WRONG_CODE", "The code is not correct. 4 tries left.", [{ field: "code", message: "The code is not correct. 4 tries left." }]),
    );
  visit("/verify-email?email=maya%40test.dev&sent=1");
  await userEvent.type(screen.getByLabelText("Code"), "4829");
  await userEvent.click(screen.getByRole("button", { name: "Verify email" }));
  expect(screen.getByText("Enter the 6 digits from the email")).toBeInTheDocument();
  expect(verifyEmail).not.toHaveBeenCalled();

  await userEvent.type(screen.getByLabelText("Code"), "00");
  await userEvent.click(screen.getByRole("button", { name: "Verify email" }));
  expect(await screen.findByText("The code is not correct. 4 tries left.")).toBeInTheDocument();
});

test('"Send a new code" waits a minute after a code was sent', async () => {
  const resendCode = vi.spyOn(authApi, "resendCode").mockResolvedValue();
  const { unmount } = visit("/verify-email?email=maya%40test.dev&sent=1");
  expect(screen.getByRole("button", { name: "Send a new code in 60s" })).toBeDisabled();
  unmount();

  visit("/verify-email?email=maya%40test.dev"); // came from the login page: no code was just sent
  expect(screen.getByText(/Your email is not verified yet/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Send a new code" }));
  expect(resendCode).toHaveBeenCalledWith("maya@test.dev");
  expect(await screen.findByRole("button", { name: "Send a new code in 60s" })).toBeDisabled();
});

test("without an email in the address it goes back to Register", () => {
  visit("/verify-email");
  expect(screen.getByText("Register page")).toBeInTheDocument();
});
