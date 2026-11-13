import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { clearFailures, recordFailure, stopIfBlocked } from "../../lib/loginLimiter";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { checkCode, codeExpired, secondsBeforeNewCode, sendCode, waitBeforeNewCode } from "./emailCode";

// FR-01: min 8 chars, 1 letter and 1 number. Also used to change the password in My account.
export const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Za-z]/, "Needs a letter")
  .regex(/\d/, "Needs a number");
export const nameRule = z.string().trim().min(2, "At least 2 characters").max(100, "At most 100 characters");

const emailRule = z.string().trim().toLowerCase().email();

// FR-01: name, unique email, password.
const registerSchema = z.object({ name: nameRule, email: emailRule, password: passwordRule });
const loginSchema = z.object({ email: emailRule, password: z.string() });
const codeRule = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6 digits from the email");
const verifySchema = z.object({ email: emailRule, code: codeRule });
const resetSchema = z.object({ email: emailRule, code: codeRule, password: passwordRule });

// The fields we send back. Never the password hash.
const publicUser = { id: true, name: true, email: true, role: true } as const;

// FR-02: JWT valid for 1 hour. "sub" (subject) is the user id.
const sign = (u: { id: number; role: string }) => jwt.sign({ role: u.role }, process.env.JWT_SECRET!, { subject: String(u.id), expiresIn: "1h" });
// What login (and a right code) sends back: a token and the user.
const session = (u: { id: number; name: string; email: string; role: string }) => ({
  token: sign(u),
  user: { id: u.id, name: u.name, email: u.email, role: u.role },
});
const loginKey = (ip: string | undefined, email: string) => `login|${ip}|${email}`;

export const authRouter = Router();

const alreadyVerified = () => new AppError(409, "ALREADY_VERIFIED", "This email is already verified. Please log in.");
const noAccount = () => new AppError(404, "NOT_FOUND", "No account uses this email. Please register first.");

// Register: save the account, then email a 6-digit code. It can log in after the code is typed.
authRouter.post("/register", validate(registerSchema), async (_req, res) => {
  const { name, email, password } = res.locals.body;
  const existing = await prisma.user.findUnique({ where: { email }, select: { emailVerifiedAt: true, emailCode: { select: { sentAt: true } } } });
  if (existing?.emailVerifiedAt) throw new AppError(409, "EMAIL_TAKEN", "This email is already registered");
  // Registered before but never verified (a typo, or someone used this email by mistake):
  // the details are replaced and a new code is sent. Only the owner of the inbox can finish.
  if (existing) waitBeforeNewCode(existing.emailCode?.sentAt, res);
  const passwordHash = await bcrypt.hash(password, 10); // FR-01: stored hashed
  const user = await prisma.user.upsert({ where: { email }, create: { name, email, passwordHash }, update: { name, passwordHash }, select: publicUser });
  await sendCode(user);
  res.status(201).json(user);
});

// The code from the email. Right code: the email is verified and the user is logged in.
authRouter.post("/verify-email", validate(verifySchema), async (_req, res) => {
  const { email, code } = res.locals.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw noAccount();
  if (user.emailVerifiedAt) throw alreadyVerified();
  await checkCode(user.id, code, "VERIFY_EMAIL"); // a wrong or old code stops here (400)
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailCode.delete({ where: { userId: user.id } }),
  ]);
  res.json(session(user));
});

// "Send a new code" (at most once a minute). The old code stops working.
authRouter.post("/resend-code", validate(z.object({ email: emailRule })), async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: res.locals.body.email },
    select: { ...publicUser, emailVerifiedAt: true, emailCode: { select: { sentAt: true } } },
  });
  if (!user) throw noAccount();
  if (user.emailVerifiedAt) throw alreadyVerified();
  waitBeforeNewCode(user.emailCode?.sentAt, res);
  await sendCode(user);
  res.status(204).end();
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = res.locals.body;
  // Too many wrong passwords for this email from this computer: wait first (see loginLimiter.ts)
  const key = loginKey(req.ip, email);
  stopIfBlocked(key, res);
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for a wrong email and a wrong password, so nobody can find out which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFailure(key);
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is wrong");
  }
  clearFailures(key);
  // Right password, but the email was never verified: the website opens the "Check your email" page.
  if (!user.emailVerifiedAt) throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email first. Type the 6-digit code we sent you.");
  res.json(session(user));
});

// "Forgot password?": email a 6-digit code to choose a new password.
// The answer is always 204, also for an email nobody uses, so nobody can find out which emails have an account.
// For the same reason, asking again within a minute is not an error: no new email is sent.
authRouter.post("/forgot-password", validate(z.object({ email: emailRule })), async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { email: res.locals.body.email }, select: { ...publicUser, emailCode: { select: { sentAt: true } } } });
  if (user && !secondsBeforeNewCode(user.emailCode?.sentAt)) await sendCode(user, "RESET_PASSWORD");
  res.status(204).end();
});

// The code from the "Forgot password?" email, and a new password. Right code: the password is changed and the user is logged in.
authRouter.post("/reset-password", validate(resetSchema), async (req, res) => {
  const { email, code, password } = res.locals.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw codeExpired(); // the same answer as for a code that is gone: don't say whether the email has an account
  await checkCode(user.id, code, "RESET_PASSWORD");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      // Typing the code proves the email is theirs, so an account that was never verified is verified now.
      data: { passwordHash: await bcrypt.hash(password, 10), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    }),
    prisma.emailCode.delete({ where: { userId: user.id } }),
  ]);
  clearFailures(loginKey(req.ip, email)); // blocked after 5 wrong passwords? The new password works at once.
  res.json(session(user));
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.user.id }, select: publicUser });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  res.json(user);
});
