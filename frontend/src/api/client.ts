import type { ApiErrorBody } from "./types";

// Guide 4.4. Every call to the real API goes through api(). It adds the token,
// reads the standard error format, and logs the user out on 401.
// The API address comes from .env.development (VITE_CORE_API).

export class ApiError extends Error {
  // Written as normal fields: tsconfig's "erasableSyntaxOnly" does not allow
  // the guide's `constructor(public status: number, ...)` shortcut.
  status: number;
  code: string;
  details: ApiErrorBody["error"]["details"];

  constructor(status: number, code: string, message: string, details: ApiErrorBody["error"]["details"] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let token: string | null = sessionStorage.getItem("token");
let onUnauthorized = () => {};

export const setToken = (t: string | null) => {
  token = t;
  if (t) sessionStorage.setItem("token", t);
  else sessionStorage.removeItem("token");
};

export const setOnUnauthorized = (fn: () => void) => {
  onUnauthorized = fn;
};

// Falls back to the local API when VITE_CORE_API isn't set (e.g. in a production build).
export const CORE_API: string = import.meta.env.VITE_CORE_API ?? "http://localhost:4000";

export async function api<T>(base: "core" | "reports", path: string, init: RequestInit = {}): Promise<T> {
  const url = (base === "core" ? CORE_API : import.meta.env.VITE_REPORTS_API) + path;
  // A file upload (FormData) must not be sent as JSON: the browser sets its own Content-Type.
  const isForm = init.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: { ...(!isForm && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }), ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    const e = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? res.statusText, e?.details);
  }
  return body as T;
}
