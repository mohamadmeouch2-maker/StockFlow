import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export type AuthUser = { id: number; role: "CUSTOMER" | "ADMIN" };

// FR-02 / FR-03: needs "Authorization: Bearer <token>", otherwise 401.
// The token must also still be valid for this user: after a password change, older tokens get
// 401 SESSION_ENDED, so a thief who was logged in is logged out at once (see lib/session.ts).
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "UNAUTHORIZED", "Login required");
  let payload: { sub: string; ver?: number };
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as typeof payload;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  // One quick look-up by id. The role comes from the database too, so it is always up to date.
  const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) }, select: { role: true, tokenVersion: true } });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  // Tokens made before this check existed have no "ver": they count as version 0.
  if ((payload.ver ?? 0) !== user.tokenVersion) throw new AppError(401, "SESSION_ENDED", "Your password was changed. Please log in again.");
  res.locals.user = { id: Number(payload.sub), role: user.role } satisfies AuthUser;
  next();
}

// For things visitors may do too (e.g. writing to Customer service): with a token the user is
// recognised (res.locals.user), without one the request goes on as a visitor.
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return next();
  return requireAuth(req, res, next);
}

// FR-03: logged in but with the wrong role -> 403. Use after requireAuth.
export const requireRole = (role: AuthUser["role"]) => (_req: Request, res: Response, next: NextFunction) => {
  if (res.locals.user?.role !== role) throw new AppError(403, "FORBIDDEN", "Not allowed");
  next();
};
