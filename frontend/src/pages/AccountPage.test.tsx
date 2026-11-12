import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { accountApi } from "../api/account";
import { ApiError } from "../api/client";
import type { Account } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { AccountPage } from "./AccountPage";

const rami: Account = {
  id: 3,
  name: "Rami",
  email: "rami@test.dev",
  role: "CUSTOMER",
  phone: null,
  city: null,
  address: null,
  createdAt: "2026-11-01T10:00:00Z",
};
const updateUser = vi.fn();
const get = vi.spyOn(accountApi, "get");
const rename = vi.spyOn(accountApi, "rename").mockImplementation(async (name) => ({ ...rami, name }));
const saveAddress = vi.spyOn(accountApi, "saveAddress").mockImplementation(async (shipTo) => ({ ...rami, ...shipTo }));
const changePassword = vi.spyOn(accountApi, "changePassword");
beforeEach(() => get.mockResolvedValue(rami));

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user: rami, loading: false, login: vi.fn(), logout: vi.fn(), updateUser } as AuthState}>
        <AccountPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

test("I can change my name, and the menu gets the new name", async () => {
  renderPage();
  const name = await screen.findByLabelText("Name");
  expect(screen.getByText("rami@test.dev")).toBeInTheDocument(); // the email is shown, not editable
  await userEvent.clear(name);
  await userEvent.type(name, "Rami Haddad");
  await userEvent.click(screen.getByRole("button", { name: "Save name" }));
  expect(rename).toHaveBeenCalledWith("Rami Haddad");
  expect(updateUser).toHaveBeenCalledWith({ id: 3, name: "Rami Haddad", email: "rami@test.dev", role: "CUSTOMER" });
});

test("a customer saves a delivery address, and can then remove it", async () => {
  renderPage();
  await userEvent.type(await screen.findByLabelText("Phone number"), "03 555 777");
  await userEvent.type(screen.getByLabelText("City"), "Zahle");
  await userEvent.type(screen.getByLabelText("Address"), "Brazil Street, Nour Building, 2nd floor");
  expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument(); // nothing saved yet
  await userEvent.click(screen.getByRole("button", { name: "Save address" }));
  expect(saveAddress).toHaveBeenCalledWith({ phone: "03 555 777", city: "Zahle", address: "Brazil Street, Nour Building, 2nd floor" });
  expect(await screen.findByRole("button", { name: "Remove" })).toBeInTheDocument();
});

test("changing the password: the two new ones must match, and the server's answer is shown", async () => {
  changePassword.mockRejectedValue(
    new ApiError(400, "WRONG_PASSWORD", "The current password is not correct", [{ field: "currentPassword", message: "The current password is not correct" }]),
  );
  renderPage();
  await userEvent.type(await screen.findByLabelText("Current password"), "Wrong1234");
  await userEvent.type(screen.getByLabelText("New password"), "NewPass123");
  await userEvent.type(screen.getByLabelText("New password again"), "NewPass124");
  await userEvent.click(screen.getByRole("button", { name: "Change password" }));
  expect(await screen.findByText("The two new passwords are not the same")).toBeInTheDocument();
  expect(changePassword).not.toHaveBeenCalled();

  await userEvent.clear(screen.getByLabelText("New password again"));
  await userEvent.type(screen.getByLabelText("New password again"), "NewPass123");
  await userEvent.click(screen.getByRole("button", { name: "Change password" }));
  expect(changePassword).toHaveBeenCalledWith("Wrong1234", "NewPass123");
  expect(await screen.findByText("The current password is not correct")).toBeInTheDocument();
});

test("admins have no delivery address, only their details and password", async () => {
  get.mockResolvedValue({ ...rami, role: "ADMIN" });
  renderPage();
  expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  expect(screen.queryByText("Delivery address")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
});
