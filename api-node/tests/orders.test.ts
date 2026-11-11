import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

// The most important test file (guide 5.1): it covers the stock rules.
let customerToken = "";
let otherCustomerToken = "";
let adminToken = "";
let productId = 0;
let categoryId = 0;

beforeAll(async () => {
  await resetDb();
  customerToken = await createUser("c@test.dev");
  otherCustomerToken = await createUser("other@test.dev");
  adminToken = await createUser("admin@test.dev", "ADMIN");
  categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  productId = (await prisma.product.create({ data: { name: "Widget", price: 10, stock: 3, categoryId } })).id;
});
afterAll(() => prisma.$disconnect());

const order = (quantity: number, token = customerToken, id = productId) =>
  request(app).post("/api/orders").set(auth(token)).send({ items: [{ productId: id, quantity }] });
const stockOf = async (id: number) => (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;
const newProduct = async (stock: number) => (await prisma.product.create({ data: { name: "Gadget", price: 2.5, stock, categoryId } })).id;

test("rejects orders without a token", async () => {
  await request(app).post("/api/orders").send({ items: [] }).expect(401);
});

test("creates an order, computes the total on the server and deducts stock (FR-07, FR-08)", async () => {
  const res = await order(2).expect(201);
  expect(Number(res.body.total)).toBe(20);
  expect(res.body.status).toBe("PENDING");
  expect(res.body.items[0].product.name).toBe("Widget");
  expect(await stockOf(productId)).toBe(1);
});

test("returns 409 and changes nothing when stock is insufficient (FR-07)", async () => {
  const res = await order(5).expect(409);
  expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  expect(await stockOf(productId)).toBe(1);
});

test("two simultaneous orders for the last item: exactly one succeeds", async () => {
  const results = await Promise.all([order(1), order(1)]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await stockOf(productId)).toBe(0);
});

test("one short line fails the whole order: no stock changes anywhere (FR-07)", async () => {
  const gadget = await newProduct(5);
  await request(app)
    .post("/api/orders")
    .set(auth(customerToken))
    .send({ items: [{ productId: gadget, quantity: 2 }, { productId, quantity: 1 }] }) // Widget has 0 left
    .expect(409);
  expect(await stockOf(gadget)).toBe(5);
});

test("rejects invalid quantity with field details", async () => {
  const res = await order(0).expect(400);
  expect(res.body.error.details[0].field).toBe("items.0.quantity");
});

test("admins cannot place orders, only customers", async () => {
  await order(1, adminToken).expect(403);
});

test("my orders shows only my own orders, newest first (FR-09)", async () => {
  const gadget = await newProduct(10);
  await order(1, otherCustomerToken, gadget).expect(201);
  const res = await request(app).get("/api/orders/mine").set(auth(customerToken)).expect(200);
  expect(res.body).toHaveLength(2); // the 2 successful orders from the tests above
  const dates = res.body.map((o: { createdAt: string }) => new Date(o.createdAt).getTime());
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
});

test("cancelling a Pending order restores the stock, and only once (FR-10)", async () => {
  const gadget = await newProduct(4);
  const created = await order(3, customerToken, gadget).expect(201);
  expect(await stockOf(gadget)).toBe(1);

  await request(app).post(`/api/orders/${created.body.id}/cancel`).set(auth(otherCustomerToken)).expect(403); // not the owner
  const res = await request(app).post(`/api/orders/${created.body.id}/cancel`).set(auth(customerToken)).expect(200);
  expect(res.body.status).toBe("CANCELLED");
  expect(await stockOf(gadget)).toBe(4);

  await request(app).post(`/api/orders/${created.body.id}/cancel`).set(auth(customerToken)).expect(409); // already cancelled
  expect(await stockOf(gadget)).toBe(4);
});

test("admin moves orders Pending -> Shipped -> Delivered; other changes are blocked (FR-12)", async () => {
  const gadget = await newProduct(5);
  const { id } = (await order(1, customerToken, gadget).expect(201)).body;
  const patch = (status: string, token = adminToken) => request(app).patch(`/api/orders/${id}/status`).set(auth(token)).send({ status });

  await patch("SHIPPED", customerToken).expect(403); // customers can't change status
  await patch("DELIVERED").expect(409); // can't skip Shipped
  await patch("SHIPPED").expect(200);
  await request(app).post(`/api/orders/${id}/cancel`).set(auth(customerToken)).expect(409); // too late to cancel
  const delivered = await patch("DELIVERED").expect(200);
  expect(delivered.body.status).toBe("DELIVERED");
});

test("admin can list all orders and filter by status (FR-12)", async () => {
  const all = await request(app).get("/api/orders").set(auth(adminToken)).expect(200);
  expect(all.body.length).toBeGreaterThanOrEqual(4);
  expect(all.body[0].user.email).toBeDefined();
  const cancelled = await request(app).get("/api/orders?status=CANCELLED").set(auth(adminToken)).expect(200);
  expect(cancelled.body.every((o: { status: string }) => o.status === "CANCELLED")).toBe(true);
  await request(app).get("/api/orders?status=WRONG").set(auth(adminToken)).expect(400);
  await request(app).get("/api/orders").set(auth(customerToken)).expect(403);
});

test("a product that appears in orders cannot be deleted", async () => {
  const res = await request(app).delete(`/api/products/${productId}`).set(auth(adminToken)).expect(409);
  expect(res.body.error.code).toBe("IN_USE");
});

// Delivery options: Standard (free, 3-5 days) or Express (+$9.99, next day).
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (iso: string) => (new Date(iso).getTime() - Date.now()) / DAY;

test("standard delivery is free and arrives within 5 days; express adds $9.99 and arrives the next day", async () => {
  const gadget = await newProduct(10); // $2.50 each
  const standard = (await order(2, customerToken, gadget).expect(201)).body; // no choice sent = standard
  expect(standard.delivery).toBe("STANDARD");
  expect(Number(standard.deliveryFee)).toBe(0);
  expect(Number(standard.total)).toBe(5);
  expect(daysFromNow(standard.deliverBy)).toBeCloseTo(5, 1);

  const express = (
    await request(app)
      .post("/api/orders")
      .set(auth(customerToken))
      .send({ items: [{ productId: gadget, quantity: 2 }], delivery: "EXPRESS" })
      .expect(201)
  ).body;
  expect(express.delivery).toBe("EXPRESS");
  expect(Number(express.deliveryFee)).toBe(9.99);
  expect(Number(express.total)).toBe(14.99); // 2 x $2.50 + $9.99
  expect(daysFromNow(express.deliverBy)).toBeCloseTo(1, 1);
});

test("the browser can't choose its own delivery fee, and unknown deliveries are refused", async () => {
  const gadget = await newProduct(10);
  const send = (body: object) => request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId: gadget, quantity: 1 }], ...body });
  const sneaky = await send({ delivery: "EXPRESS", deliveryFee: 0 }).expect(201); // the extra field is ignored
  expect(Number(sneaky.body.deliveryFee)).toBe(9.99);
  const bad = await send({ delivery: "ROCKET" }).expect(400);
  expect(bad.body.error.details[0].field).toBe("delivery");
});

test("the cart can ask for the delivery options", async () => {
  const res = await request(app).get("/api/orders/delivery-options").set(auth(customerToken)).expect(200);
  expect(res.body).toEqual([
    { id: "STANDARD", label: "Standard delivery", fee: "0.00", minDays: 3, maxDays: 5 },
    { id: "EXPRESS", label: "Express delivery", fee: "9.99", minDays: 1, maxDays: 1 },
  ]);
});
