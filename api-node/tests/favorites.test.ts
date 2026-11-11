import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

// Customers save products as favourites (the heart button).
let saraToken = "";
let omarToken = "";
let adminToken = "";
let stapler = 0;
let lamp = 0;

beforeAll(async () => {
  await resetDb();
  saraToken = await createUser("sara@test.dev");
  omarToken = await createUser("omar@test.dev");
  adminToken = await createUser("admin@test.dev", "ADMIN");
  const categoryId = (await prisma.category.create({ data: { name: "Office" } })).id;
  stapler = (await prisma.product.create({ data: { name: "Stapler", price: 4, stock: 5, categoryId } })).id;
  lamp = (await prisma.product.create({ data: { name: "Lamp", price: 20, stock: 0, categoryId } })).id;
});
afterAll(() => prisma.$disconnect());

const mine = async (token = saraToken) => (await request(app).get("/api/favorites").set(auth(token)).expect(200)).body;

test("a customer saves products; the last one saved comes first, with category and rating", async () => {
  await request(app).put(`/api/favorites/${stapler}`).set(auth(saraToken)).expect(204);
  await request(app).put(`/api/favorites/${lamp}`).set(auth(saraToken)).expect(204);
  await request(app).put(`/api/favorites/${lamp}`).set(auth(saraToken)).expect(204); // twice is fine
  const list = await mine();
  expect(list.map((p: { name: string }) => p.name)).toEqual(["Lamp", "Stapler"]);
  expect(list[0]).toMatchObject({ category: { name: "Office" }, rating: { average: null, count: 0 } });
});

test("each customer has their own favourites", async () => {
  expect(await mine(omarToken)).toEqual([]);
});

test("removing a favourite", async () => {
  await request(app).delete(`/api/favorites/${lamp}`).set(auth(saraToken)).expect(204);
  await request(app).delete(`/api/favorites/${lamp}`).set(auth(saraToken)).expect(204); // already gone: fine
  expect((await mine()).map((p: { name: string }) => p.name)).toEqual(["Stapler"]);
});

test("an unknown product is 404; favourites are for logged-in customers only", async () => {
  await request(app).put("/api/favorites/999999").set(auth(saraToken)).expect(404);
  await request(app).get("/api/favorites").expect(401);
  await request(app).get("/api/favorites").set(auth(adminToken)).expect(403);
});
