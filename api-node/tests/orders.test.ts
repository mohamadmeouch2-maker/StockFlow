import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb, shipTo } from "./helpers";

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
  request(app).post("/api/orders").set(auth(token)).send({ items: [{ productId: id, quantity }], ...shipTo });
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
    .send({ items: [{ productId: gadget, quantity: 2 }, { productId, quantity: 1 }], ...shipTo }) // Widget has 0 left
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
  expect(all.body).toMatchObject({ page: 1, pageSize: 20 });
  expect(all.body.total).toBeGreaterThanOrEqual(4);
  expect(all.body.items[0].user.email).toBeDefined();
  const cancelled = await request(app).get("/api/orders?status=CANCELLED").set(auth(adminToken)).expect(200);
  expect(cancelled.body.items.every((o: { status: string }) => o.status === "CANCELLED")).toBe(true);
  await request(app).get("/api/orders?status=WRONG").set(auth(adminToken)).expect(400);
  await request(app).get("/api/orders").set(auth(customerToken)).expect(403);
});

test("the admin order list comes one page at a time, newest first", async () => {
  const list = async (query: string) => (await request(app).get(`/api/orders?${query}`).set(auth(adminToken)).expect(200)).body;
  const { total } = await list("pageSize=100");
  const first = await list("page=1&pageSize=2");
  const second = await list("page=2&pageSize=2");
  expect(first).toMatchObject({ page: 1, pageSize: 2, total });
  expect(first.items).toHaveLength(2);
  expect(second.items).toHaveLength(2);
  const ids = [...first.items, ...second.items].map((o: { id: number }) => o.id);
  expect(new Set(ids).size).toBe(4); // no order on two pages
  expect((await list(`page=${total + 1}&pageSize=1`)).items).toEqual([]); // after the last page: empty
  await request(app).get("/api/orders?pageSize=500").set(auth(adminToken)).expect(400); // at most 100 per page
});

test("a product that appears in orders cannot be deleted", async () => {
  const res = await request(app).delete(`/api/products/${productId}`).set(auth(adminToken)).expect(409);
  expect(res.body.error.code).toBe("IN_USE");
});

// Delivery options: Standard (free, 3-5 days) or Express (+$4.50, next day).
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (iso: string) => (new Date(iso).getTime() - Date.now()) / DAY;

test("standard delivery is free and arrives within 5 days; express adds $4.50 and arrives the next day", async () => {
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
      .send({ items: [{ productId: gadget, quantity: 2 }], delivery: "EXPRESS", ...shipTo })
      .expect(201)
  ).body;
  expect(express.delivery).toBe("EXPRESS");
  expect(Number(express.deliveryFee)).toBe(4.5);
  expect(Number(express.total)).toBe(9.5); // 2 x $2.50 + $4.50
  expect(daysFromNow(express.deliverBy)).toBeCloseTo(1, 1);
});

test("the browser can't choose its own delivery fee, and unknown deliveries are refused", async () => {
  const gadget = await newProduct(10);
  const send = (body: object) => request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId: gadget, quantity: 1 }], ...shipTo, ...body });
  const sneaky = await send({ delivery: "EXPRESS", deliveryFee: 0 }).expect(201); // the extra field is ignored
  expect(Number(sneaky.body.deliveryFee)).toBe(4.5);
  const bad = await send({ delivery: "ROCKET" }).expect(400);
  expect(bad.body.error.details[0].field).toBe("delivery");
});

test("the cart can ask for the delivery options", async () => {
  const res = await request(app).get("/api/orders/delivery-options").set(auth(customerToken)).expect(200);
  expect(res.body).toEqual([
    { id: "STANDARD", label: "Standard delivery", fee: "0.00", minDays: 3, maxDays: 5 },
    { id: "EXPRESS", label: "Express delivery", fee: "4.50", minDays: 1, maxDays: 1 },
  ]);
});

test("the order remembers when it was shipped, delivered or cancelled (tracking timeline)", async () => {
  const gadget = await newProduct(10);
  const { id } = (await order(1, customerToken, gadget).expect(201)).body;
  const patch = (status: string) => request(app).patch(`/api/orders/${id}/status`).set(auth(adminToken)).send({ status }).expect(200);
  const shipped = (await patch("SHIPPED")).body;
  expect(shipped.shippedAt).not.toBeNull();
  expect(shipped.deliveredAt).toBeNull();
  const delivered = (await patch("DELIVERED")).body;
  expect(new Date(delivered.deliveredAt).getTime()).toBeGreaterThanOrEqual(new Date(delivered.shippedAt).getTime());

  const other = (await order(1, customerToken, gadget).expect(201)).body;
  const cancelled = (await request(app).post(`/api/orders/${other.id}/cancel`).set(auth(customerToken)).expect(200)).body;
  expect(cancelled).toMatchObject({ status: "CANCELLED", shippedAt: null });
  expect(cancelled.cancelledAt).not.toBeNull();
});

// Where to deliver: a phone number, a city and an address, typed in the cart.
test("an order needs a phone number, a city and an address; without them nothing changes", async () => {
  const gadget = await newProduct(5);
  const send = (body: object) => request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId: gadget, quantity: 1 }], ...body });
  const missing = await send({}).expect(400);
  expect(missing.body.error.details.map((d: { field: string }) => d.field)).toEqual(["phone", "city", "address"]);

  const bad = await send({ phone: "call me", city: " ", address: "x" }).expect(400);
  expect(bad.body.error.details).toEqual([
    { field: "phone", message: "Enter a valid phone number, for example +961 70 123 456" },
    { field: "city", message: "Enter the city" },
    { field: "address", message: "Enter the street, building and floor" },
  ]);
  await send({ ...shipTo, phone: "12 34" }).expect(400); // too few digits
  expect(await stockOf(gadget)).toBe(5);
});

test("the order saves where to deliver; the admin sees it and the cart can fill it in next time", async () => {
  const gadget = await newProduct(5);
  const token = await createUser("new@test.dev");
  const savedAddress = () => request(app).get("/api/orders/saved-address").set(auth(token)).expect(200);
  const place = (where: object) => request(app).post("/api/orders").set(auth(token)).send({ items: [{ productId: gadget, quantity: 1 }], ...where }).expect(201);
  expect((await savedAddress()).body).toBeNull(); // no orders yet

  await place(shipTo);
  const created = await place({ phone: " 03-123456 ", city: "Saida ", address: "  Riad Al Solh Street, Building 4, 2nd floor" });
  const clean = { phone: "03-123456", city: "Saida", address: "Riad Al Solh Street, Building 4, 2nd floor" }; // extra spaces removed
  expect(created.body).toMatchObject(clean);
  expect((await savedAddress()).body).toEqual({ ...clean, from: "last-order" }); // the newest order's address

  const all = await request(app).get("/api/orders").set(auth(adminToken)).expect(200);
  expect(all.body.items.find((o: { id: number }) => o.id === created.body.id)).toMatchObject(clean);
  await request(app).get("/api/orders/saved-address").set(auth(adminToken)).expect(403); // customers only
});
