import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthContext, type AuthState } from "../auth/authContext";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";

// Shows where we landed, with the email from the address.
function ResetPage() {
  const [params] = useSearchParams();
  return (
    <p>
      Reset page for {params.get("email")} sent={params.get("sent")}
    </p>
  );
}

const visit = (url: string) =>
  render(
    <AuthContext.Provider value={{ user: null, loading: false, login: vi.fn(), startSession: vi.fn(), logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

test('"Forgot password?" on the login page keeps the email I already typed', async () => {
  visit("/login");
  await userEvent.type(screen.getByLabelText("Email"), "maya@test.dev");
  await userEvent.click(screen.getByRole("link", { name: "Forgot password?" }));
  expect(screen.getByRole("heading", { name: "Forgot your password?" })).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toHaveValue("maya@test.dev");
});

test("sends a code to my email and opens the Reset page", async () => {
  const forgotPassword = vi.spyOn(authApi, "forgotPassword").mockResolvedValue();
  visit("/forgot-password");
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
  expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
  expect(forgotPassword).not.toHaveBeenCalled();

  await userEvent.type(screen.getByLabelText("Email"), " Maya@Test.dev ");
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
  expect(forgotPassword).toHaveBeenCalledWith("maya@test.dev");
  expect(await screen.findByText("Reset page for maya@test.dev sent=1")).toBeInTheDocument();
});

test("shows the server's message when the email can't be sent", async () => {
  vi.spyOn(authApi, "forgotPassword").mockRejectedValue(
    new ApiError(503, "EMAIL_NOT_SENT", "We could not send the email right now. Please try again in a minute.", []),
  );
  visit("/forgot-password?email=maya%40test.dev");
  await userEvent.click(screen.getByRole("button", { name: "Send me a code" }));
  expect(await screen.findByText("We could not send the email right now. Please try again in a minute.")).toBeInTheDocument();
});
