import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

let adminToken = "";
let customerToken = "";
let plenty = 0; // stock 10, reorder level 5
let low = 0; // stock 2, reorder level 5 (already low)

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  const categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  plenty = (await prisma.product.create({ data: { name: "Stapler", price: 2, stock: 10, reorderLevel: 5, categoryId } })).id;
  low = (await prisma.product.create({ data: { name: "Tape", price: 1, stock: 2, reorderLevel: 5, categoryId } })).id;
});
afterAll(() => prisma.$disconnect());

const order = (productId: number, quantity: number) =>
  request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId, quantity }] });
const alerts = async () => (await request(app).get("/api/notifications").set(auth(adminToken)).expect(200)).body;

test("an order that leaves enough stock creates no alert", async () => {
  await order(plenty, 3).expect(201); // 10 -> 7, still above 5
  expect(await alerts()).toEqual({ unread: 0, items: [] });
});

test("going down to the reorder level creates one low-stock alert, not one per order", async () => {
  await order(plenty, 2).expect(201); // 7 -> 5: crosses the line
  await order(plenty, 1).expect(201); // 5 -> 4: was already low, no new alert
  const { unread, items } = await alerts();
  expect(unread).toBe(1);
  expect(items[0]).toMatchObject({ type: "LOW_STOCK", productId: plenty, readAt: null, product: { name: "Stapler" } });
  expect(items[0].message).toBe("Stapler is low on stock: 5 left (reorder level 5)");
});

test("a product that is already low alerts again only when it sells out", async () => {
  await order(low, 1).expect(201); // 2 -> 1: no new alert
  expect((await alerts()).unread).toBe(1);
  await order(low, 1).expect(201); // 1 -> 0
  const { unread, items } = await alerts();
  expect(unread).toBe(2);
  expect(items[0]).toMatchObject({ type: "OUT_OF_STOCK", message: "Tape is sold out" });
});

test("a refused order leaves no alert behind (same transaction)", async () => {
  await order(plenty, 99).expect(409);
  expect((await alerts()).unread).toBe(2);
});

test("admins mark alerts as read, one or all", async () => {
  const { items } = await alerts();
  await request(app).post(`/api/notifications/${items[0].id}/read`).set(auth(adminToken)).expect(204);
  expect((await alerts()).unread).toBe(1);
  await request(app).post("/api/notifications/read-all").set(auth(adminToken)).expect(204);
  const after = await alerts();
  expect(after.unread).toBe(0);
  expect(after.items.every((n: { readAt: string | null }) => n.readAt !== null)).toBe(true);
  await request(app).post("/api/notifications/999999/read").set(auth(adminToken)).expect(404);
});

test("alerts are admin-only", async () => {
  await request(app).get("/api/notifications").expect(401);
  await request(app).get("/api/notifications").set(auth(customerToken)).expect(403);
  await request(app).post("/api/notifications/read-all").set(auth(customerToken)).expect(403);
});
