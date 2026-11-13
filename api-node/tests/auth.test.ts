import request from "supertest";
import { app } from "../src/app";
import { mailer } from "../src/lib/mailer";
import { prisma } from "../src/lib/prisma";
import { BLOCK_MINUTES, MAX_FAILS, minutesBlocked, recordFailure } from "../src/lib/loginLimiter";
import { auth, createUser, resetDb } from "./helpers";

// No real emails in the tests: we keep them and read the code from the subject.
const sent = jest.spyOn(mailer, "send").mockResolvedValue();
const lastCode = (to: string) => {
  const mail = sent.mock.calls.findLast(([m]) => m.to === to)?.[0];
  return mail?.subject.match(/\d{6}/)?.[0] ?? "";
};
const wrongCode = (code: string) => (code === "000000" ? "111111" : "000000");
// "Send a new code" needs a 1-minute wait: pretend the last code was sent 2 minutes ago.
const minuteLater = (email: string) => prisma.emailCode.updateMany({ where: { user: { email } }, data: { sentAt: new Date(Date.now() - 120_000) } });

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

const register = (body: object) => request(app).post("/api/auth/register").send(body);
const verify = (email: string, code: string) => request(app).post("/api/auth/verify-email").send({ email, code });
const resend = (email: string) => request(app).post("/api/auth/resend-code").send({ email });

test("register creates a customer, emails a 6-digit code and never returns the password hash (FR-01)", async () => {
  const res = await register({ name: "Sara <b>", email: "Sara@Test.dev", password: "Password1" }).expect(201);
  expect(res.body).toEqual({ id: expect.any(Number), name: "Sara <b>", email: "sara@test.dev", role: "CUSTOMER" });
  const saved = await prisma.user.findUniqueOrThrow({ where: { email: "sara@test.dev" }, include: { emailCode: true } });
  expect(saved.passwordHash).not.toBe("Password1"); // stored hashed
  expect(saved.emailVerifiedAt).toBeNull();
  const code = lastCode("sara@test.dev");
  expect(code).toMatch(/^\d{6}$/);
  expect(saved.emailCode?.codeHash).not.toContain(code); // the code is stored hashed too
  expect(sent.mock.calls.at(-1)![0].html).toContain("Sara &lt;b&gt;"); // a name can't add HTML to the email
});

test("a new account can't log in before the email is verified", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: "sara@test.dev", password: "Password1" }).expect(403);
  expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
});

test("a wrong code says how many tries are left; the right code verifies and logs in", async () => {
  const code = lastCode("sara@test.dev");
  const wrong = await verify("sara@test.dev", wrongCode(code)).expect(400);
  expect(wrong.body.error).toMatchObject({ code: "WRONG_CODE", message: "The code is not correct. 4 tries left." });
  await verify("sara@test.dev", "12ab").expect(400); // not 6 digits: refused before a try is used

  const ok = await verify("sara@test.dev", ` ${code} `).expect(200);
  expect(ok.body.user).toEqual({ id: expect.any(Number), name: "Sara <b>", email: "sara@test.dev", role: "CUSTOMER" });
  await request(app).get("/api/auth/me").set(auth(ok.body.token)).expect(200);
  expect(await prisma.emailCode.count()).toBe(0); // the code is gone
  await verify("sara@test.dev", code).expect(409); // already verified
  await resend("sara@test.dev").expect(409);
});

test("register with an email that is already used returns 409", async () => {
  await register({ name: "Sara", email: "sara@test.dev", password: "Password1" }).expect(409);
});

test("after 5 wrong codes even the right one stops working, and a new code is needed", async () => {
  await register({ name: "Omar", email: "omar@test.dev", password: "Password1" }).expect(201);
  const code = lastCode("omar@test.dev");
  for (let left = 4; left > 0; left--) expect((await verify("omar@test.dev", wrongCode(code)).expect(400)).body.error.message).toContain(`${left} tr`);
  expect((await verify("omar@test.dev", wrongCode(code)).expect(400)).body.error.message).toBe("The code is not correct. Please ask for a new one.");
  expect((await verify("omar@test.dev", code).expect(400)).body.error.code).toBe("CODE_EXPIRED");

  const tooSoon = await resend("omar@test.dev").expect(429); // the last code was sent less than a minute ago
  expect(tooSoon.body.error.code).toBe("TOO_SOON");
  expect(Number(tooSoon.headers["retry-after"])).toBeGreaterThan(50);
  await minuteLater("omar@test.dev");
  await resend("omar@test.dev").expect(204);
  await verify("omar@test.dev", lastCode("omar@test.dev")).expect(200);
});

test("a code stops working after 15 minutes", async () => {
  await register({ name: "Lina", email: "lina@test.dev", password: "Password1" }).expect(201);
  await prisma.emailCode.updateMany({ where: { user: { email: "lina@test.dev" } }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await verify("lina@test.dev", lastCode("lina@test.dev")).expect(400)).body.error.code).toBe("CODE_EXPIRED");
});

test("an email that was never verified can be registered again: new details, new code", async () => {
  await register({ name: "Typo", email: "maya@test.dev", password: "Password1" }).expect(201);
  await register({ name: "Maya", email: "maya@test.dev", password: "Password2" }).expect(429); // wait 1 minute first
  await minuteLater("maya@test.dev");
  const old = lastCode("maya@test.dev");
  await register({ name: "Maya", email: "maya@test.dev", password: "Password2" }).expect(201);
  if (old !== lastCode("maya@test.dev")) await verify("maya@test.dev", old).expect(400); // the old code no longer works
  const ok = await verify("maya@test.dev", lastCode("maya@test.dev")).expect(200);
  expect(ok.body.user.name).toBe("Maya");
  await request(app).post("/api/auth/login").send({ email: "maya@test.dev", password: "Password2" }).expect(200);
});

test("if the email can't be sent, register says so and can be tried again at once", async () => {
  jest.spyOn(console, "error").mockImplementationOnce(() => {});
  sent.mockRejectedValueOnce(new Error("Invalid login: 535 Username and Password not accepted"));
  const res = await register({ name: "Rami", email: "rami@test.dev", password: "Password1" }).expect(503);
  expect(res.body.error.code).toBe("EMAIL_NOT_SENT");
  await register({ name: "Rami", email: "rami@test.dev", password: "Password1" }).expect(201); // no 1-minute wait
});

test("verify and resend for an email nobody registered return 404", async () => {
  await verify("ghost@test.dev", "123456").expect(404);
  await resend("ghost@test.dev").expect(404);
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
