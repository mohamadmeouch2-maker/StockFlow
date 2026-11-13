import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import type { Response } from "express";
import type { CodePurpose } from "@prisma/client";
import { AppError } from "../../lib/errors";
import { escapeHtml, mailer } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";

// 6-digit codes sent by email, for two things:
//   VERIFY_EMAIL    after Register. The account can log in only after the code is typed (POST /api/auth/verify-email).
//   RESET_PASSWORD  from "Forgot password?". The code lets the user choose a new password (POST /api/auth/reset-password).
// A user has at most one code: a new one replaces the old one. A code only works for its own purpose.
export const CODE_MINUTES = 15; // a code works for 15 minutes
export const MAX_CODE_TRIES = 5; // 5 wrong tries, then a new code is needed
export const RESEND_SECONDS = 60; // a new code can be asked for once a minute

// How many seconds until a new code may be sent (0 = now).
export function secondsBeforeNewCode(lastSentAt: Date | undefined, now = Date.now()) {
  return lastSentAt ? Math.max(0, Math.ceil(RESEND_SECONDS - (now - lastSentAt.getTime()) / 1000)) : 0;
}

// "Send a new code" too soon: say how long to wait (and in the Retry-After header).
export function waitBeforeNewCode(lastSentAt: Date | undefined, res: Response, now = Date.now()) {
  const seconds = secondsBeforeNewCode(lastSentAt, now);
  if (!seconds) return;
  res.setHeader("Retry-After", String(seconds));
  throw new AppError(429, "TOO_SOON", `Please wait ${seconds} seconds before asking for a new code.`);
}

// Makes a new code for this user (it replaces the old one) and emails it.
export async function sendCode(user: { id: number; name: string; email: string }, purpose: CodePurpose = "VERIFY_EMAIL") {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0"); // 000000 to 999999, hard to guess
  const data = { purpose, codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), attempts: 0, sentAt: new Date() };
  await prisma.emailCode.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  try {
    await mailer.send(codeEmail(user, code, purpose));
  } catch (err) {
    // e.g. a wrong Gmail app password, or no internet. Forget the code so the user can try again at once.
    console.error("Could not send the email with the code:", err);
    await prisma.emailCode.delete({ where: { userId: user.id } }).catch(() => {});
    throw new AppError(503, "EMAIL_NOT_SENT", "We could not send the email right now. Please try again in a minute.");
  }
}

const codeError = (code: "CODE_EXPIRED" | "WRONG_CODE", message: string) => new AppError(400, code, message, [{ field: "code", message }]);
export const codeExpired = () => codeError("CODE_EXPIRED", "This code does not work any more. Please ask for a new one.");

// Checks a typed code. Throws a 400 (shown under the Code field) if it is wrong, too old or for something else.
// The caller deletes the code once it has used it.
export async function checkCode(userId: number, code: string, purpose: CodePurpose) {
  // Use up one try first, in one SQL statement, so many guesses sent at the same time don't get extra tries.
  const spent = await prisma.emailCode.updateMany({
    where: { userId, purpose, attempts: { lt: MAX_CODE_TRIES }, expiresAt: { gt: new Date() } },
    data: { attempts: { increment: 1 } },
  });
  const saved = spent.count ? await prisma.emailCode.findUnique({ where: { userId } }) : null;
  if (!saved) throw codeExpired();
  if (!(await bcrypt.compare(code, saved.codeHash))) {
    const left = MAX_CODE_TRIES - saved.attempts;
    throw codeError(
      "WRONG_CODE",
      left > 0 ? `The code is not correct. ${left} ${left === 1 ? "try" : "tries"} left.` : "The code is not correct. Please ask for a new one.",
    );
  }
}

// What each email says. The code is in the subject too, so it shows in the inbox list.
const emails: Record<CodePurpose, { subject: string; why: string; ignore: string }> = {
  VERIFY_EMAIL: {
    subject: "Your StockFlow code",
    why: "Type it on the <b>Check your email</b> page to finish creating your account.",
    ignore: "If you did not create a StockFlow account, you can ignore this email.",
  },
  RESET_PASSWORD: {
    subject: "Your StockFlow password reset code",
    why: "Type it on the <b>Reset your password</b> page to choose a new password.",
    ignore: "If you did not ask to reset your password, you can ignore this email. Your password stays the same.",
  },
};

function codeEmail(user: { name: string; email: string }, code: string, purpose: CodePurpose) {
  const { subject, why, ignore } = emails[purpose];
  const lasts = `It works for ${CODE_MINUTES} minutes.`;
  const text = [`Hi ${user.name},`, "", `Your StockFlow code is: ${code}`, "", `${why.replace(/<\/?b>/g, '"')} ${lasts}`, "", ignore].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="color:#2563eb;margin-bottom:4px">StockFlow</h2>
  <p>Hi ${escapeHtml(user.name)},</p>
  <p>Your code is:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">${code}</p>
  <p>${why} ${lasts}</p>
  <p style="color:#64748b;font-size:13px">${ignore}</p>
</div>`;
  return { to: user.email, subject: `${subject}: ${code}`, text, html };
}
