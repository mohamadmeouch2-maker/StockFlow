import { api } from "./client";
import type { Session, User } from "./types";

// Register, then the 6-digit code from the email. (Logging in is in AuthProvider.)
export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api<User>("core", "/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  verifyEmail: (email: string, code: string) => api<Session>("core", "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) }),
  resendCode: (email: string) => api<void>("core", "/api/auth/resend-code", { method: "POST", body: JSON.stringify({ email }) }),
};
