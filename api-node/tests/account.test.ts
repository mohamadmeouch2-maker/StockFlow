import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// My account: name, saved delivery address and password.
let token = "";
let adminToken = "";
beforeAll(async () => {
  await resetDb();
  token = await createUser("rami@test.dev");
  adminToken = await createUser("boss@test.dev", "ADMIN");
});
afterAll(() => prisma.$disconnect());

const account = (t = token) => request(app).get("/api/account").set(auth(t));
const changePassword = (body: object, t = token) => request(app).post("/api/account/password").set(auth(t)).send(body);
const login = (password: string) => request(app).post("/api/auth/login").send({ email: "rami@test.dev", password });

test("My account shows my details, never the password hash, and needs a login", async () => {
  const res = await account().expect(200);
  expect(res.body).toMatchObject({ name: "rami", email: "rami@test.dev", role: "CUSTOMER", phone: null, city: null, address: null });
  expect(res.body.passwordHash).toBeUndefined();
  await request(app).get("/api/account").expect(401);
});

test("I can change my name (at least 2 characters); the email stays", async () => {
  const res = await request(app).patch("/api/account").set(auth(token)).send({ name: "  Rami Haddad ", email: "other@test.dev" }).expect(200);
  expect(res.body).toMatchObject({ name: "Rami Haddad", email: "rami@test.dev" });
  expect((await request(app).get("/api/auth/me").set(auth(token))).body.name).toBe("Rami Haddad");
  const bad = await request(app).patch("/api/account").set(auth(token)).send({ name: "R" }).expect(400);
  expect(bad.body.error.details[0]).toEqual({ field: "name", message: "At least 2 characters" });
});

test("a customer saves a delivery address; the cart uses it before the last order's address", async () => {
  const savedAddress = () => request(app).get("/api/orders/saved-address").set(auth(token)).expect(200);
  expect((await savedAddress()).body).toBeNull(); // nothing yet

  const bad = await request(app).put("/api/account/address").set(auth(token)).send({ ...shipTo, phone: "123" }).expect(400);
  expect(bad.body.error.details[0].field).toBe("phone");

  const home = { phone: "03 555 777", city: "Zahle", address: "Brazil Street, Nour Building, 2nd floor" };
  const saved = await request(app).put("/api/account/address").set(auth(token)).send(home).expect(200);
  expect(saved.body).toMatchObject(home);
  expect((await savedAddress()).body).toEqual({ ...home, from: "account" });

  // Forget it: the cart falls back to the last order's address
  const category = await prisma.category.create({ data: { name: "Test" } });
  const product = await prisma.product.create({ data: { name: "Pen", price: 1, stock: 5, categoryId: category.id } });
  await request(app).post("/api/orders").set(auth(token)).send({ items: [{ productId: product.id, quantity: 1 }], ...shipTo }).expect(201);
  expect((await savedAddress()).body).toEqual({ ...home, from: "account" }); // still the saved one
  await request(app).delete("/api/account/address").set(auth(token)).expect(200);
  expect((await savedAddress()).body).toEqual({ ...shipTo, from: "last-order" });

  await request(app).put("/api/account/address").set(auth(adminToken)).send(home).expect(403); // customers only
});

test("changing the password needs the current one and follows the register rules", async () => {
  const wrong = await changePassword({ currentPassword: "Nope1234", newPassword: "NewPass123" }).expect(400);
  expect(wrong.body.error.details).toEqual([{ field: "currentPassword", message: "The current password is not correct" }]);
  const weak = await changePassword({ currentPassword: "Password1", newPassword: "short" }).expect(400);
  expect(weak.body.error.details[0].field).toBe("newPassword");
  const same = await changePassword({ currentPassword: "Password1", newPassword: "Password1" }).expect(400);
  expect(same.body.error.details[0].message).toBe("Choose a password different from the current one");

  await changePassword({ currentPassword: "Password1", newPassword: "NewPass123" }).expect(204);
  await login("Password1").expect(401); // the old one no longer works
  await login("NewPass123").expect(200);
});

test("after 5 wrong current passwords, changing the password waits 15 minutes", async () => {
  const t = await createUser("guesser@test.dev");
  for (let i = 0; i < 5; i++) await changePassword({ currentPassword: "Wrong1234", newPassword: "NewPass123" }, t).expect(400);
  const blocked = await changePassword({ currentPassword: "Password1", newPassword: "NewPass123" }, t).expect(429);
  expect(blocked.body.error.code).toBe("TOO_MANY_ATTEMPTS");
});
