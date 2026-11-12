import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { BLOCK_MINUTES, MAX_FAILS, minutesBlocked, recordFailure } from "../src/lib/loginLimiter";
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

// Brute-force protection: 5 wrong passwords -> that login waits 15 minutes.
const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });

test("after 5 wrong passwords the login is blocked for 15 minutes, even with the right password", async () => {
  await createUser("guess@test.dev");
  for (let i = 0; i < MAX_FAILS; i++) await login("guess@test.dev", "Wrong1234").expect(401);
  const blocked = await login("guess@test.dev", "Password1").expect(429);
  expect(blocked.body.error).toMatchObject({ code: "TOO_MANY_ATTEMPTS", message: "Too many wrong passwords. Please try again in 15 minutes." });
  expect(blocked.headers["retry-after"]).toBe("900");
  await login("me@test.dev", "Password1").expect(200); // other accounts still work
});

test("a successful login starts the count again", async () => {
  await createUser("forgetful@test.dev");
  for (let i = 0; i < MAX_FAILS - 1; i++) await login("forgetful@test.dev", "Wrong1234").expect(401);
  await login("forgetful@test.dev", "Password1").expect(200);
  for (let i = 0; i < MAX_FAILS - 1; i++) await login("forgetful@test.dev", "Wrong1234").expect(401); // not blocked yet
});

test("the block ends by itself after 15 minutes", () => {
  const start = Date.now();
  for (let i = 0; i < MAX_FAILS; i++) recordFailure("clock-test", start);
  expect(minutesBlocked("clock-test", start)).toBe(BLOCK_MINUTES);
  expect(minutesBlocked("clock-test", start + 14 * 60_000)).toBe(1);
  expect(minutesBlocked("clock-test", start + BLOCK_MINUTES * 60_000)).toBe(0);
});
