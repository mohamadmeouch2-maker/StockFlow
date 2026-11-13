import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthContext, type AuthState } from "../auth/authContext";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

function Where() {
  const { pathname, search } = useLocation();
  return <p>Now at {pathname + search}</p>;
}

const visit = (url: string, login = vi.fn()) =>
  render(
    <AuthContext.Provider value={{ user: null, loading: false, login, startSession: vi.fn(), logout: vi.fn(), updateUser: vi.fn() } as AuthState}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

test("after Register the website asks for the code from the email", async () => {
  const register = vi.spyOn(authApi, "register").mockResolvedValue({ id: 7, name: "Maya", email: "maya@test.dev", role: "CUSTOMER" });
  visit("/register");
  await userEvent.type(screen.getByLabelText("Name"), "Maya");
  await userEvent.type(screen.getByLabelText("Email"), "Maya@Test.dev");
  await userEvent.type(screen.getByLabelText("Password"), "Password1");
  await userEvent.click(screen.getByRole("button", { name: "Register" }));
  expect(register).toHaveBeenCalledWith({ name: "Maya", email: "Maya@Test.dev", password: "Password1" });
  expect(await screen.findByText("Now at /verify-email?email=maya%40test.dev&sent=1")).toBeInTheDocument();
});

test("logging in before the email is verified opens the code page", async () => {
  const login = vi.fn().mockRejectedValue(new ApiError(403, "EMAIL_NOT_VERIFIED", "Please verify your email first."));
  visit("/login", login);
  await userEvent.type(screen.getByLabelText("Email"), "maya@test.dev");
  await userEvent.type(screen.getByLabelText("Password"), "Password1");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByText("Now at /verify-email?email=maya%40test.dev")).toBeInTheDocument();
});
