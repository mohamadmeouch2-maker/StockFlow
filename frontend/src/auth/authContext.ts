import { createContext } from "react";
import type { User } from "../api/types";

export type AuthState = {
  user: User | null; // null = not logged in
  loading: boolean; // true while we check a saved token after a page refresh
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
};

export const AuthContext = createContext<AuthState | null>(null);
