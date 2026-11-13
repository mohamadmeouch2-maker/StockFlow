import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import type { Session } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { ResetPasswordPage } from "./ResetPasswordPage";

const startSession = vi.fn();
const session: Session = { token: "t0k3n", user: { id: 7, name: "Maya", email: "maya@test.dev", role: "CUSTOMER" } };

const visit = (url: string) =>
  render(
    <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), startSession, logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<p>Forgot page</p>} />
          <Route path="/products" element={<p>Products page</p>} />
          <Route path="/admin" element={<p>Admin dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const fill = async (code: string, password: string, repeat = password) => {
  await userEvent.type(screen.getByLabelText("Code"), code);
  await userEvent.type(screen.getByLabelText("New password"), password);
  await userEvent.type(screen.getByLabelText("Repeat the new password"), repeat);
  await userEvent.click(screen.getByRole("button", { name: "Save new password" }));
};

test("the right code and a new password log me in and open the products", async () => {
  const resetPassword = vi.spyOn(authApi, "resetPassword").mockResolvedValue(session);
  visit("/reset-password?email=maya%40test.dev&sent=1");
  expect(screen.getByText("maya@test.dev")).toBeInTheDocument();
  await fill("482 913", "NewPassw0rd"); // the code pasted with a space
  expect(resetPassword).toHaveBeenCalledWith("maya@test.dev", "482913", "NewPassw0rd");
  expect(await screen.findByText("Products page")).toBeInTheDocument();
  expect(startSession).toHaveBeenCalledWith(session);
});

test("an admin lands on the dashboard", async () => {
  vi.spyOn(authApi, "resetPassword").mockResolvedValue({ ...session, user: { ...session.user, role: "ADMIN" } });
  visit("/reset-password?email=maya%40test.dev");
  await fill("482913", "NewPassw0rd");
  expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();
});

test("the rules are checked before sending: 6 digits, a strong password, typed twice the same", async () => {
  const resetPassword = vi.spyOn(authApi, "resetPassword");
  visit("/reset-password?email=maya%40test.dev");
  await fill("4829", "short", "shorty");
  expect(screen.getByText("Enter the 6 digits from the email")).toBeInTheDocument();
  expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  expect(screen.getByText("The two passwords are not the same")).toBeInTheDocument();
  expect(resetPassword).not.toHaveBeenCalled();
});

test("a wrong code from the server shows under the Code box", async () => {
  const message = "The code is not correct. 4 tries left.";
  vi.spyOn(authApi, "resetPassword").mockRejectedValue(new ApiError(400, "WRONG_CODE", message, [{ field: "code", message }]));
  visit("/reset-password?email=maya%40test.dev");
  await fill("000000", "NewPassw0rd");
  expect(await screen.findByText(message)).toHaveAttribute("id", "code-error");
});

test('"Send a new code" waits a minute after a code was sent', async () => {
  const forgotPassword = vi.spyOn(authApi, "forgotPassword").mockResolvedValue();
  const { unmount } = visit("/reset-password?email=maya%40test.dev&sent=1");
  expect(screen.getByRole("button", { name: "Send a new code in 60s" })).toBeDisabled();
  unmount();

  visit("/reset-password?email=maya%40test.dev");
  await userEvent.type(screen.getByLabelText("Code"), "111111");
  await userEvent.click(screen.getByRole("button", { name: "Send a new code" }));
  expect(forgotPassword).toHaveBeenCalledWith("maya@test.dev");
  expect(await screen.findByRole("button", { name: "Send a new code in 60s" })).toBeDisabled();
  expect(screen.getByLabelText("Code")).toHaveValue(""); // the old code stops working
});

test("without an email in the address it goes back to Forgot password", () => {
  visit("/reset-password");
  expect(screen.getByText("Forgot page")).toBeInTheDocument();
});
