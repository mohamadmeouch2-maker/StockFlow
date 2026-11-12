import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, setOnUnauthorized, setToken } from "../api/client";
import type { User } from "../api/types";
import { AuthContext } from "./authContext";

// Guide 4.5: keeps the logged-in user for the whole app.
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" if there is a saved token to check.
  const [loading, setLoading] = useState(() => sessionStorage.getItem("token") !== null);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    queryClient.removeQueries({ queryKey: ["orders"] }); // don't show the last user's orders to the next one
  }, [queryClient]);

  useEffect(() => {
    setOnUnauthorized(logout); // any 401 from the API (e.g. token expired) logs out
    if (!sessionStorage.getItem("token")) return;
    // After a page refresh: ask the API who the saved token belongs to (FR-02).
    api<User>("core", "/api/auth/me")
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("core", "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
}
