import { useContext } from "react";
import { AuthContext } from "./authContext";

// Any component can call useAuth() to get the user, login and logout.
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
