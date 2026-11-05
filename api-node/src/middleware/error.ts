import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

const send = (res: Response, status: number, code: string, message: string, details: unknown[] = []) =>
  res.status(status).json({ error: { code, message, details } });

// The last middleware: turns any error into the standard format (NFR-06).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  // Body that is not valid JSON (thrown by express.json())
  if (err instanceof SyntaxError && "body" in err) return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return send(res, 409, "CONFLICT", "Already exists"); // unique value taken, e.g. email
    if (err.code === "P2003") return send(res, 409, "IN_USE", "It is used by other records"); // e.g. product in orders
    if (err.code === "P2025") return send(res, 404, "NOT_FOUND", "Not found"); // update/delete of a missing row
  }

  console.error(err);
  return send(res, 500, "INTERNAL", "Something went wrong");
}
