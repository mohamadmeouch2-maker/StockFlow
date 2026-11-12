import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../lib/errors";
import { clearFailures, recordFailure, stopIfBlocked } from "../../lib/loginLimiter";
import { prisma } from "../../lib/prisma";
import { shipToFields } from "../../lib/shipTo";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { nameRule, passwordRule } from "../auth/auth.routes";

// My account: change my name, save a delivery address (customers) and change my password.
// What we send back. Never the password hash.
const accountFields = { id: true, name: true, email: true, role: true, phone: true, city: true, address: true, createdAt: true } as const;

const nameBody = z.object({ name: nameRule });
const addressBody = z.object(shipToFields);
const passwordBody = z
  .object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword: passwordRule })
  .refine((b) => b.newPassword !== b.currentPassword, { message: "Choose a password different from the current one", path: ["newPassword"] });

export const accountRouter = Router();
accountRouter.use(requireAuth); // only for logged-in users, and only their own account

const update = (id: number, data: object) => prisma.user.update({ where: { id }, data, select: accountFields });

// My details and my saved delivery address
accountRouter.get("/", async (_req, res) => {
  res.json(await prisma.user.findUniqueOrThrow({ where: { id: res.locals.user.id }, select: accountFields }));
});

// Change my name. The email is the login, so it stays.
accountRouter.patch("/", validate(nameBody), async (_req, res) => {
  res.json(await update(res.locals.user.id, { name: res.locals.body.name }));
});

// Save my delivery address (customers): from now on the cart fills it in.
accountRouter.put("/address", requireRole("CUSTOMER"), validate(addressBody), async (_req, res) => {
  res.json(await update(res.locals.user.id, res.locals.body));
});

// Forget my saved address: the cart then uses the address of my last order.
accountRouter.delete("/address", requireRole("CUSTOMER"), async (_req, res) => {
  res.json(await update(res.locals.user.id, { phone: null, city: null, address: null }));
});

// Change my password: first the current one, then a new one with the same rules as when registering.
// Wrong current passwords are limited like logins: after 5, wait 15 minutes.
accountRouter.post("/password", validate(passwordBody), async (_req, res) => {
  const { currentPassword, newPassword } = res.locals.body;
  const key = `password|${res.locals.user.id}`;
  stopIfBlocked(key, res);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: res.locals.user.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    recordFailure(key);
    throw new AppError(400, "WRONG_PASSWORD", "The current password is not correct", [
      { field: "currentPassword", message: "The current password is not correct" },
    ]);
  }
  clearFailures(key);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } }); // stored hashed (FR-01)
  res.status(204).end();
});
