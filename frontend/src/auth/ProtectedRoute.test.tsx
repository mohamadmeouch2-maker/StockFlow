import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test } from "vitest";
import type { User } from "../api/types";
import { AuthContext } from "./authContext";
import { ProtectedRoute } from "./ProtectedRoute";

// Opens `path` as the given user and returns what's on the screen.
const visit = (path: string, user: User | null) =>
  render(
    <AuthContext.Provider value={{ user, loading: false, login: async () => user!, startSession: () => {}, logout: () => {}, updateUser: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<p>Admin page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

const customer: User = { id: 1, name: "C", email: "c@test.dev", role: "CUSTOMER" };
const admin: User = { id: 2, name: "A", email: "a@test.dev", role: "ADMIN" };

test("redirects a logged-out user to /login", () => {
  visit("/admin", null);
  expect(screen.getByText("Login page")).toBeInTheDocument();
});

test("sends a customer who opens an admin page back home (FR-03)", () => {
  visit("/admin", customer);
  expect(screen.getByText("Home page")).toBeInTheDocument();
});

test("lets an admin in", () => {
  visit("/admin", admin);
  expect(screen.getByText("Admin page")).toBeInTheDocument();
});
