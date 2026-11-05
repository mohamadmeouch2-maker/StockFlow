// One error class used everywhere, so every failure has a status and a code (NFR-06).
// The error middleware turns it into { error: { code, message, details } }.
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError(404, "NOT_FOUND", `${what} not found`);

// Reads an :id from the URL. "abc" or "-1" can't match any row, so they are 404 too.
// (Express types req.params values as string | string[] on routes with extra middleware.)
export const parseId = (value: string | string[], what: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw notFound(what);
  return id;
};
