import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { api, ApiError, setOnUnauthorized, setToken } from "../api/client";
import { ToastProvider } from "../toast/ToastProvider";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

afterEach(() => vi.restoreAllMocks());

// What the API answers when a token stopped working because the password was changed on another device.
const sessionEnded = () =>
  new Response(JSON.stringify({ error: { code: "SESSION_ENDED", message: "Your password was changed. Please log in again." } }), { status: 401 });

function Who() {
  const { user, loading } = useAuth();
  return <p>{loading ? "Checking..." : user ? `Logged in as ${user.name}` : "Logged out"}</p>;
}

test("when the password was changed on another device, this one is logged out with a message", async () => {
  setToken("old-t0k3n"); // saved before the password change
  vi.spyOn(globalThis, "fetch").mockResolvedValue(sessionEnded());
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <AuthProvider>
          <Who />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("Logged out")).toBeInTheDocument();
  expect(screen.getByText("Your password was changed, so you were logged out here. Please log in with the new password.")).toBeInTheDocument();
  expect(sessionStorage.getItem("token")).toBeNull();
});

test("an answer to a request sent with an older token doesn't log out (this device just got a new one)", async () => {
  const onUnauthorized = vi.fn();
  setOnUnauthorized(onUnauthorized);
  setToken("old-t0k3n");
  let answer!: (res: Response) => void;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));

  const call = api("core", "/api/orders/mine").catch((err: unknown) => err);
  setToken("new-t0k3n"); // the password was changed on this device while the request was on its way
  answer(sessionEnded());
  expect(await call).toBeInstanceOf(ApiError);
  expect(onUnauthorized).not.toHaveBeenCalled();

  const again = api("core", "/api/orders/mine").catch((err: unknown) => err); // sent with the current token
  answer(sessionEnded());
  await again;
  expect(onUnauthorized).toHaveBeenCalledWith("SESSION_ENDED");
  setToken(null);
});
