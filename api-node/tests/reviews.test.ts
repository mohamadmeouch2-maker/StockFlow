import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

// Ratings out of 10 with comments, and product views.
let buyerToken = "";
let otherToken = "";
let adminToken = "";
let productId = 0;

beforeAll(async () => {
  await resetDb();
  buyerToken = await createUser("buyer@test.dev");
  otherToken = await createUser("other@test.dev");
  adminToken = await createUser("admin@test.dev", "ADMIN");
  const categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  productId = (await prisma.product.create({ data: { name: "Lamp", price: 20, stock: 10, categoryId } })).id;
  await request(app).post("/api/orders").set(auth(buyerToken)).send({ items: [{ productId, quantity: 1 }] }).expect(201);
});
afterAll(() => prisma.$disconnect());

const rate = (token: string, body: object) => request(app).put(`/api/products/${productId}/reviews`).set(auth(token)).send(body);

test("a new product has no reviews yet", async () => {
  const res = await request(app).get(`/api/products/${productId}/reviews`).expect(200);
  expect(res.body).toEqual({ average: null, count: 0, reviews: [] });
});

test("only customers who bought the product can rate it", async () => {
  await request(app).put(`/api/products/${productId}/reviews`).send({ rating: 9 }).expect(401);
  await rate(adminToken, { rating: 9 }).expect(403);
  const notBought = await rate(otherToken, { rating: 9 }).expect(403);
  expect(notBought.body.error.code).toBe("NOT_PURCHASED");
  expect((await request(app).get(`/api/products/${productId}/reviews/me`).set(auth(otherToken))).body.canReview).toBe(false);
  expect((await request(app).get(`/api/products/${productId}/reviews/me`).set(auth(buyerToken))).body).toEqual({ canReview: true, review: null });
});

test("the rating must be a whole number from 1 to 10", async () => {
  for (const rating of [0, 11, 7.5]) await rate(buyerToken, { rating }).expect(400);
});

test("a buyer rates the product, then changes the rating", async () => {
  await rate(buyerToken, { rating: 9, comment: "Bright and simple." }).expect(200);
  let res = await request(app).get(`/api/products/${productId}/reviews`).expect(200);
  expect(res.body).toMatchObject({ average: 9, count: 1 });
  expect(res.body.reviews[0]).toMatchObject({ userName: "buyer", rating: 9, comment: "Bright and simple." });

  await rate(buyerToken, { rating: 7, comment: "" }).expect(200); // same customer: updates, doesn't add
  res = await request(app).get(`/api/products/${productId}/reviews`).expect(200);
  expect(res.body).toMatchObject({ average: 7, count: 1 });
  expect(res.body.reviews[0].comment).toBeNull();
});

test("the average shows in the product list and detail (one decimal)", async () => {
  await request(app).post("/api/orders").set(auth(otherToken)).send({ items: [{ productId, quantity: 1 }] }).expect(201);
  await rate(otherToken, { rating: 10 }).expect(200);
  const detail = await request(app).get(`/api/products/${productId}`).expect(200);
  expect(detail.body.rating).toEqual({ average: 8.5, count: 2 });
  const list = await request(app).get("/api/products").expect(200);
  expect(list.body.items[0].rating).toEqual({ average: 8.5, count: 2 });
});

test("a cancelled order doesn't count as a purchase", async () => {
  const token = await createUser("canceller@test.dev");
  const order = await request(app).post("/api/orders").set(auth(token)).send({ items: [{ productId, quantity: 1 }] }).expect(201);
  await request(app).post(`/api/orders/${order.body.id}/cancel`).set(auth(token)).expect(200);
  await request(app).put(`/api/products/${productId}/reviews`).set(auth(token)).send({ rating: 1 }).expect(403);
});

test("a customer can delete their review", async () => {
  await request(app).delete(`/api/products/${productId}/reviews`).set(auth(otherToken)).expect(204);
  await request(app).delete(`/api/products/${productId}/reviews`).set(auth(otherToken)).expect(404);
  expect((await request(app).get(`/api/products/${productId}`)).body.rating).toEqual({ average: 7, count: 1 });
});

test("opening a product page counts a view", async () => {
  const before = (await request(app).get(`/api/products/${productId}`)).body.viewCount;
  await request(app).post(`/api/products/${productId}/view`).expect(204);
  await request(app).post(`/api/products/${productId}/view`).expect(204);
  expect((await request(app).get(`/api/products/${productId}`)).body.viewCount).toBe(before + 2);
  await request(app).post("/api/products/999999/view").expect(404);
});
