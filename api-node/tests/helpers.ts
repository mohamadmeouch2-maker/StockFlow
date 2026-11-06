import bcrypt from "bcryptjs";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

// Empties every table in the TEST database, so each test file starts clean.
export async function resetDb() {
  await prisma.review.deleteMany();
  await prisma.orderIssue.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

// Creates a user directly in the database and returns a login token for it.
export async function createUser(email: string, role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  const passwordHash = await bcrypt.hash("Password1", 4); // 4 rounds: fast enough for tests
  await prisma.user.create({ data: { name: email.split("@")[0], email, passwordHash, role } });
  const res = await request(app).post("/api/auth/login").send({ email, password: "Password1" });
  return res.body.token as string;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
