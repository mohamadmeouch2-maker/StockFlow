import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import type { Response } from "express";
import { AppError } from "../../lib/errors";
import { escapeHtml, mailer } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";

// Email verification: after Register we email a 6-digit code. The account can log in
// only after the code is typed on the website (POST /api/auth/verify-email).
export const CODE_MINUTES = 15; // a code works for 15 minutes
export const MAX_CODE_TRIES = 5; // 5 wrong tries, then a new code is needed
export const RESEND_SECONDS = 60; // a new code can be asked for once a minute

// "Send a new code" too soon: say how long to wait (and in the Retry-After header).
export function waitBeforeNewCode(lastSentAt: Date | undefined, res: Response, now = Date.now()) {
  if (!lastSentAt) return;
  const seconds = Math.ceil(RESEND_SECONDS - (now - lastSentAt.getTime()) / 1000);
  if (seconds <= 0) return;
  res.setHeader("Retry-After", String(seconds));
  throw new AppError(429, "TOO_SOON", `Please wait ${seconds} seconds before asking for a new code.`);
}

// Makes a new code for this user (it replaces the old one) and emails it.
export async function sendCode(user: { id: number; name: string; email: string }) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0"); // 000000 to 999999, hard to guess
  const data = { codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: 0, sentAt: new Date() };
  await prisma.emailCode.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  try {
    await mailer.send(codeEmail(user, code));
  } catch (err) {
    // e.g. a wrong Gmail app password, or no internet. Forget the code so the user can try again at once.
    console.error("Could not send the verification email:", err);
    await prisma.emailCode.delete({ where: { userId: user.id } }).catch(() => {});
    throw new AppError(503, "EMAIL_NOT_SENT", "We could not send the email right now. Please try again in a minute.");
  }
}

function codeEmail(user: { name: string; email: string }, code: string) {
  const text = [
    `Hi ${user.name},`,
    "",
    `Your StockFlow code is: ${code}`,
    "",
    `Type it on the "Check your email" page to finish creating your account. It works for ${CODE_MINUTES} minutes.`,
    "",
    "If you did not create a StockFlow account, you can ignore this email.",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="color:#2563eb;margin-bottom:4px">StockFlow</h2>
  <p>Hi ${escapeHtml(user.name)},</p>
  <p>Your code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">${code}</p>
  <p>Type it on the <b>Check your email</b> page to finish creating your account. It works for ${CODE_MINUTES} minutes.</p>
  <p style="color:#64748b;font-size:13px">If you did not create a StockFlow account, you can ignore this email.</p>
</div>`;
  return { to: user.email, subject: `Your StockFlow code: ${code}`, text, html };
}
