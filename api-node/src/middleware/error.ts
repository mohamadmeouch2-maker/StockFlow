import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../lib/errors";
import { MAX_IMAGE_MB } from "../lib/uploads";

const send = (res: Response, status: number, code: string, message: string, details: unknown[] = []) =>
  res.status(status).json({ error: { code, message, details } });

// The last middleware: turns any error into the standard format (NFR-06).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) return send(res, err.status, err.code, err.message, err.details);

  // Body that is not valid JSON (thrown by express.json())
  if (err instanceof SyntaxError && "body" in err) return send(res, 400, "INVALID_JSON", "Request body is not valid JSON");

  // Photo upload problems (FR-17), e.g. a file that is too big
  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? `The image must be ${MAX_IMAGE_MB} MB or smaller` : "Send one image in the \"image\" field";
    return send(res, 400, "VALIDATION_ERROR", "Invalid input", [{ field: "image", message }]);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return send(res, 409, "CONFLICT", "Already exists"); // unique value taken, e.g. email
    if (err.code === "P2003") return send(res, 409, "IN_USE", "It is used by other records"); // e.g. product in orders
    if (err.code === "P2025") return send(res, 404, "NOT_FOUND", "Not found"); // update/delete of a missing row
  }

  console.error(err);
  return send(res, 500, "INTERNAL", "Something went wrong");
}
