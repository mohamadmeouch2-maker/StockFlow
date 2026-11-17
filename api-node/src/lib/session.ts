import jwt from "jsonwebtoken";

// FR-02: a login is a JWT (token) valid for 1 hour.
//   sub  the user id
//   role CUSTOMER or ADMIN
//   ver  the user's token version when the token was made. Changing the password adds 1 to
//        users.token_version, so every older token stops working (checked in requireAuth).
type SessionUser = { id: number; name: string; email: string; role: string; tokenVersion: number };

export const signToken = (u: Pick<SessionUser, "id" | "role" | "tokenVersion">) =>
  jwt.sign({ role: u.role, ver: u.tokenVersion }, process.env.JWT_SECRET!, { subject: String(u.id), expiresIn: "1h" });

// What login (and a right email code, and a password change) sends back: a token and the user. Never the password hash.
export const session = (u: SessionUser) => ({ token: signToken(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });
