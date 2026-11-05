import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

const register = (body: object) => request(app).post("/api/auth/register").send(body);

test("register creates a customer and never returns the password hash (FR-01)", async () => {
  const res = await register({ name: "Sara", email: "Sara@Test.dev", password: "Password1" }).expect(201);
  expect(res.body).toEqual({ id: expect.any(Number), name: "Sara", email: "sara@test.dev", role: "CUSTOMER" });
  const saved = await prisma.user.findUniqueOrThrow({ where: { email: "sara@test.dev" } });
  expect(saved.passwordHash).not.toBe("Password1"); // stored hashed
});

test("register with an email that is already used returns 409", async () => {
  await register({ name: "Sara", email: "sara@test.dev", password: "Password1" }).expect(409);
});

test("register with bad input returns 400 with one message per field", async () => {
  const res = await register({ name: "S", email: "not-an-email", password: "short" }).expect(400);
  const fields = res.body.error.details.map((d: { field: string }) => d.field);
  expect(fields).toEqual(expect.arrayContaining(["name", "email", "password"]));
});

test("login returns a token valid for 1 hour (FR-02)", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: "sara@test.dev", password: "Password1" }).expect(200);
  expect(res.body.user.email).toBe("sara@test.dev");
  const payload = JSON.parse(Buffer.from(res.body.token.split(".")[1], "base64url").toString());
  expect(payload.exp - payload.iat).toBe(3600);
});

test("login with a wrong password or unknown email returns the same 401", async () => {
  const wrongPassword = await request(app).post("/api/auth/login").send({ email: "sara@test.dev", password: "Wrong1234" }).expect(401);
  const unknownEmail = await request(app).post("/api/auth/login").send({ email: "nobody@test.dev", password: "Password1" }).expect(401);
  expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
});

test("/me needs a valid token (FR-03)", async () => {
  await request(app).get("/api/auth/me").expect(401);
  await request(app).get("/api/auth/me").set(auth("not-a-real-token")).expect(401);
  const token = await createUser("me@test.dev");
  const res = await request(app).get("/api/auth/me").set(auth(token)).expect(200);
  expect(res.body.email).toBe("me@test.dev");
});
