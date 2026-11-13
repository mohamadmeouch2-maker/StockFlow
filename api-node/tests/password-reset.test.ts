import request from "supertest";
import { app } from "../src/app";
import { mailer } from "../src/lib/mailer";
import { prisma } from "../src/lib/prisma";
import { MAX_FAILS } from "../src/lib/loginLimiter";
import { auth, createUser, resetDb } from "./helpers";

// "Forgot password?": a 6-digit code by email, then a new password.
// No real emails in the tests: we keep them and read the code from the subject.
const sent = jest.spyOn(mailer, "send").mockResolvedValue();
const mailsTo = (to: string) => sent.mock.calls.map(([m]) => m).filter((m) => m.to === to);
const lastCode = (to: string) => mailsTo(to).at(-1)?.subject.match(/\d{6}/)?.[0] ?? "";
const wrongCode = (code: string) => (code === "000000" ? "111111" : "000000");
// A new code can be asked for once a minute: pretend the last one was sent 2 minutes ago.
const minuteLater = (email: string) => prisma.emailCode.updateMany({ where: { user: { email } }, data: { sentAt: new Date(Date.now() - 120_000) } });

const forgot = (email: string) => request(app).post("/api/auth/forgot-password").send({ email });
const reset = (email: string, code: string, password = "NewPassw0rd") => request(app).post("/api/auth/reset-password").send({ email, code, password });
const login = (email: string, password: string) => request(app).post("/api/auth/login").send({ email, password });

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

test("forgot password emails a reset code; an email nobody uses gets the same answer and no email", async () => {
  await createUser("maya@test.dev");
  await forgot(" Maya@Test.dev ").expect(204);
  const [mail] = mailsTo("maya@test.dev");
  expect(mail.subject).toMatch(/^Your StockFlow password reset code: \d{6}$/);
  expect(mail.text).toContain('"Reset your password" page');
  const saved = await prisma.emailCode.findFirstOrThrow({ where: { user: { email: "maya@test.dev" } } });
  expect(saved.purpose).toBe("RESET_PASSWORD");
  expect(saved.codeHash).not.toContain(lastCode("maya@test.dev")); // stored hashed

  const before = sent.mock.calls.length;
  await forgot("nobody@test.dev").expect(204);
  expect(sent.mock.calls.length).toBe(before);
  await forgot("not an email").expect(400);
});

test("asking again within a minute sends no new email (and is not an error)", async () => {
  const code = lastCode("maya@test.dev");
  await forgot("maya@test.dev").expect(204);
  expect(mailsTo("maya@test.dev")).toHaveLength(1);
  await minuteLater("maya@test.dev");
  await forgot("maya@test.dev").expect(204);
  expect(mailsTo("maya@test.dev")).toHaveLength(2);
  expect(await reset("maya@test.dev", code).then((r) => r.body.error.code)).toBe("WRONG_CODE"); // the new code replaced the old one
});

test("the new password must follow the Register rules; a wrong code says how many tries are left", async () => {
  const code = lastCode("maya@test.dev");
  const weak = await reset("maya@test.dev", code, "short").expect(400);
  expect(weak.body.error.details).toContainEqual({ field: "password", message: "At least 8 characters" });
  const wrong = await reset("maya@test.dev", wrongCode(code)).expect(400);
  expect(wrong.body.error).toMatchObject({ code: "WRONG_CODE", details: [{ field: "code", message: "The code is not correct. 3 tries left." }] });
});

test("the right code changes the password and logs in; the code can't be used twice", async () => {
  const code = lastCode("maya@test.dev");
  const ok = await reset("maya@test.dev", ` ${code} `, "NewPassw0rd").expect(200);
  expect(ok.body.user).toEqual({ id: expect.any(Number), name: "maya", email: "maya@test.dev", role: "CUSTOMER" });
  await request(app).get("/api/auth/me").set(auth(ok.body.token)).expect(200);

  await login("maya@test.dev", "Password1").expect(401); // the old password is gone
  await login("maya@test.dev", "NewPassw0rd").expect(200);
  expect(await prisma.emailCode.count()).toBe(0);
  expect((await reset("maya@test.dev", code).expect(400)).body.error.code).toBe("CODE_EXPIRED");
});

test("an email nobody uses gets the same answer as a code that is gone", async () => {
  const res = await reset("nobody@test.dev", "123456").expect(400);
  expect(res.body.error).toMatchObject({
    code: "CODE_EXPIRED",
    details: [{ field: "code", message: "This code does not work any more. Please ask for a new one." }],
  });
});

test("a code stops working after 15 minutes", async () => {
  await minuteLater("maya@test.dev");
  await forgot("maya@test.dev").expect(204);
  await prisma.emailCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await reset("maya@test.dev", lastCode("maya@test.dev")).expect(400)).body.error.code).toBe("CODE_EXPIRED");
});

test("a Register code can't change the password, and a reset code can't verify an email", async () => {
  await request(app).post("/api/auth/register").send({ name: "Omar", email: "omar@test.dev", password: "Password1" }).expect(201);
  const verifyCode = lastCode("omar@test.dev");
  expect((await reset("omar@test.dev", verifyCode).expect(400)).body.error.code).toBe("CODE_EXPIRED");

  await minuteLater("omar@test.dev");
  await forgot("omar@test.dev").expect(204);
  const resetCode = lastCode("omar@test.dev");
  const verify = await request(app).post("/api/auth/verify-email").send({ email: "omar@test.dev", code: resetCode }).expect(400);
  expect(verify.body.error.code).toBe("CODE_EXPIRED");
});

test("resetting the password of an account that was never verified also verifies it", async () => {
  await reset("omar@test.dev", lastCode("omar@test.dev"), "Omar2026pass").expect(200);
  const omar = await prisma.user.findUniqueOrThrow({ where: { email: "omar@test.dev" } });
  expect(omar.emailVerifiedAt).not.toBeNull();
  await login("omar@test.dev", "Omar2026pass").expect(200);
});

test("after 5 wrong passwords, a new password works at once", async () => {
  await createUser("lina@test.dev");
  for (let i = 0; i < MAX_FAILS; i++) await login("lina@test.dev", "Wrong-pass1");
  await login("lina@test.dev", "Password1").expect(429); // blocked for 15 minutes
  await forgot("lina@test.dev").expect(204);
  await reset("lina@test.dev", lastCode("lina@test.dev"), "Lina2026pass").expect(200);
  await login("lina@test.dev", "Lina2026pass").expect(200);
});
