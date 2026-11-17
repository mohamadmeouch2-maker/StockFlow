import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

// Exchange rates: anyone reads them (to show prices in LBP or EUR), only admins change them.
let admin = "";
let customer = "";
beforeAll(async () => {
  await resetDb();
  await prisma.exchangeRate.upsert({ where: { currency: "LBP" }, create: { currency: "LBP", rate: 89500 }, update: { rate: 89500 } });
  admin = await createUser("boss@test.dev", "ADMIN");
  customer = await createUser("sara@test.dev");
});
afterAll(() => prisma.$disconnect());

const setRate = (currency: string, rate: unknown, token = admin) => request(app).put(`/api/currencies/${currency}`).set(auth(token)).send({ rate });

test("anyone can read the rates; US dollars are always 1", async () => {
  const res = await request(app).get("/api/currencies").expect(200);
  expect(res.body[0]).toEqual({ currency: "USD", rate: "1", updatedAt: null });
  expect(res.body).toContainEqual({ currency: "LBP", rate: "89500", updatedAt: expect.any(String) });
});

test("an admin sets a rate; the website gets the new one", async () => {
  const res = await setRate("EUR", "0.9").expect(200);
  expect(res.body).toMatchObject({ currency: "EUR", rate: "0.9" });
  await setRate("LBP", 90000).expect(200);
  const rates = (await request(app).get("/api/currencies")).body;
  expect(rates).toContainEqual(expect.objectContaining({ currency: "LBP", rate: "90000" }));
  expect(rates).toContainEqual(expect.objectContaining({ currency: "EUR", rate: "0.9" }));
});

test("rates must be above 0, only for LBP and EUR, and only admins may change them", async () => {
  const zero = await setRate("LBP", 0).expect(400);
  expect(zero.body.error.details).toEqual([{ field: "rate", message: "Must be above 0" }]);
  await setRate("LBP", "abc").expect(400);
  await setRate("USD", 2).expect(404); // dollars are the shop's own currency
  await setRate("LBP", 100, customer).expect(403);
  await request(app).put("/api/currencies/LBP").send({ rate: 100 }).expect(401);
});
