import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "../api/types";
import { useAuth } from "./useAuth";

// Guide 4.5. Wraps routes that need a login (and optionally a role).
// Not logged in -> login page (and back here afterwards). Wrong role -> home page.
// The API checks the role too (FR-03); this only keeps people out of pages they can't use.
export function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
