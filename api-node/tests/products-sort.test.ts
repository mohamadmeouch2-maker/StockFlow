import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createUser, resetDb } from "./helpers";

// Sorting and the "in stock only" filter of the product list.
beforeAll(async () => {
  await resetDb();
  await createUser("sara@test.dev");
  const userId = (await prisma.user.findUniqueOrThrow({ where: { email: "sara@test.dev" } })).id;
  const categoryId = (await prisma.category.create({ data: { name: "Office" } })).id;
  // Created one after the other, so "Clip" is the newest
  const desk = await prisma.product.create({ data: { name: "Desk", price: 100, stock: 2, categoryId } });
  const pen = await prisma.product.create({ data: { name: "Pen", price: 3, stock: 0, categoryId } }); // sold out
  await prisma.product.create({ data: { name: "Clip", price: 1, stock: 50, categoryId, createdAt: new Date(Date.now() + 1000) } });
  await prisma.review.create({ data: { productId: desk.id, userId, rating: 9 } });
  await prisma.review.create({ data: { productId: pen.id, userId, rating: 5 } }); // Clip has no rating
});
afterAll(() => prisma.$disconnect());

const names = async (query: string) => (await request(app).get(`/api/products?${query}`).expect(200)).body.items.map((p: { name: string }) => p.name);

test("A-Z is the default order", async () => {
  expect(await names("")).toEqual(["Clip", "Desk", "Pen"]);
});

test("sorts by price, both ways", async () => {
  expect(await names("sort=price_asc")).toEqual(["Clip", "Pen", "Desk"]);
  expect(await names("sort=price_desc")).toEqual(["Desk", "Pen", "Clip"]);
});

test("sorts by best rating (products without ratings last) and by newest", async () => {
  expect(await names("sort=rating")).toEqual(["Desk", "Pen", "Clip"]);
  expect(await names("sort=newest")).toEqual(["Clip", "Pen", "Desk"]);
});

test("rating sort still pages correctly", async () => {
  const res = await request(app).get("/api/products?sort=rating&pageSize=2&page=2").expect(200);
  expect(res.body.items.map((p: { name: string }) => p.name)).toEqual(["Clip"]);
  expect(res.body.total).toBe(3);
});

test("in stock only hides sold-out products and works with sorting", async () => {
  expect(await names("inStock=true&sort=price_desc")).toEqual(["Desk", "Clip"]);
  const res = await request(app).get("/api/products?inStock=true").expect(200);
  expect(res.body.total).toBe(2);
});

test("an unknown sort is refused", async () => {
  await request(app).get("/api/products?sort=cheapest").expect(400);
});
