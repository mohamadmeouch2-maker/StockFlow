import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../lib/errors";

export type AuthUser = { id: number; role: "CUSTOMER" | "ADMIN" };

// FR-02 / FR-03: needs "Authorization: Bearer <token>", otherwise 401.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "UNAUTHORIZED", "Login required");
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { sub: string; role: AuthUser["role"] };
    res.locals.user = { id: Number(payload.sub), role: payload.role } satisfies AuthUser;
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  next();
}

// FR-03: logged in but with the wrong role -> 403. Use after requireAuth.
export const requireRole = (role: AuthUser["role"]) => (_req: Request, res: Response, next: NextFunction) => {
  if (res.locals.user?.role !== role) throw new AppError(403, "FORBIDDEN", "Not allowed");
  next();
};
