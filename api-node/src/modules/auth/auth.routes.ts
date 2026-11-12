import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { clearFailures, minutesBlocked, recordFailure } from "../../lib/loginLimiter";
import { prisma } from "../../lib/prisma";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// FR-01: name, unique email, password with min 8 chars, 1 letter and 1 number.
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).regex(/[A-Za-z]/, "Needs a letter").regex(/\d/, "Needs a number"),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string() });

// The fields we send back. Never the password hash.
const publicUser = { id: true, name: true, email: true, role: true } as const;

// FR-02: JWT valid for 1 hour. "sub" (subject) is the user id.
const sign = (u: { id: number; role: string }) =>
  jwt.sign({ role: u.role }, process.env.JWT_SECRET!, { subject: String(u.id), expiresIn: "1h" });

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), async (_req, res) => {
  const { name, email, password } = res.locals.body;
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10) }, // FR-01: stored hashed
    select: publicUser,
  });
  res.status(201).json(user);
});

authRouter.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = res.locals.body;
  // Too many wrong passwords for this email from this computer: wait first (see loginLimiter.ts)
  const key = `login|${req.ip}|${email}`;
  const wait = minutesBlocked(key);
  if (wait) {
    res.setHeader("Retry-After", String(wait * 60)); // in seconds, the standard way to say "try later"
    throw new AppError(429, "TOO_MANY_ATTEMPTS", `Too many wrong passwords. Please try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for a wrong email and a wrong password, so nobody can find out which emails exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    recordFailure(key);
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is wrong");
  }
  clearFailures(key);
  res.json({ token: sign(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals.user.id }, select: publicUser });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
  res.json(user);
});
