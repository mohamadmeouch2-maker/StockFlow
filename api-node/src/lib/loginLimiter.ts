import type { Response } from "express";
import { AppError } from "./errors";

// Protection against password guessing (brute force).
// After 5 wrong passwords for the same account from the same computer (IP address),
// that login is blocked for 15 minutes, even with the right password.
// A successful login starts the count again. Other accounts and other computers are not affected.
// The counts live in memory: restarting the API forgets them (fine for one server).
export const MAX_FAILS = 5;
export const BLOCK_MINUTES = 15;
const BLOCK_MS = BLOCK_MINUTES * 60 * 1000;

type Entry = { count: number; since: number; blockedUntil?: number };
const fails = new Map<string, Entry>();

// A wrong guess older than 15 minutes no longer counts; a block ends after 15 minutes.
const expired = (e: Entry, now: number) => (e.blockedUntil ? now >= e.blockedUntil : now - e.since >= BLOCK_MS);

// How many minutes this key must still wait, or 0 if it may try now.
export function minutesBlocked(key: string, now = Date.now()) {
  const e = fails.get(key);
  if (!e) return 0;
  if (expired(e, now)) {
    fails.delete(key);
    return 0;
  }
  return e.blockedUntil ? Math.ceil((e.blockedUntil - now) / 60_000) : 0;
}

export function recordFailure(key: string, now = Date.now()) {
  const e = fails.get(key);
  if (!e || expired(e, now)) fails.set(key, { count: 1, since: now });
  else if (++e.count >= MAX_FAILS) e.blockedUntil = now + BLOCK_MS;
  // Now and then, forget old entries so the list can't grow forever
  if (fails.size > 10_000) for (const [k, v] of fails) if (expired(v, now)) fails.delete(k);
}

export const clearFailures = (key: string) => fails.delete(key);

// While the key is blocked: answer 429 "Too many wrong passwords. Please try again in N minutes."
export function stopIfBlocked(key: string, res: Response) {
  const wait = minutesBlocked(key);
  if (!wait) return;
  res.setHeader("Retry-After", String(wait * 60)); // in seconds, the standard way to say "try later"
  throw new AppError(429, "TOO_MANY_ATTEMPTS", `Too many wrong passwords. Please try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
}
