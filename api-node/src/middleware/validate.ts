import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/errors";

// Runs a Zod schema against the body or the query string (NFR-02).
// Bad input -> 400 with one message per field. Good input -> res.locals.body / res.locals.query.
export const validate =
  (schema: ZodType, source: "body" | "query" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
      throw new AppError(400, "VALIDATION_ERROR", "Invalid input", details);
    }
    res.locals[source] = result.data;
    next();
  };
