import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

let adminToken = "";
let customerToken = "";

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  const categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  await prisma.product.createMany({
    data: [
      { name: "Plenty", price: 1, stock: 50, reorderLevel: 5, categoryId },
      { name: "At level", price: 1, stock: 5, reorderLevel: 5, categoryId },
      { name: "Empty", price: 1, stock: 0, reorderLevel: 5, categoryId },
    ],
  });
});
afterAll(() => prisma.$disconnect());

test("low-stock lists only products at or below their reorder level, most urgent first (FR-16)", async () => {
  const res = await request(app).get("/api/reports/low-stock").set(auth(adminToken)).expect(200);
  expect(res.body.map((p: { name: string }) => p.name)).toEqual(["Empty", "At level"]);
  expect(res.body[0]).toMatchObject({ stock: 0, reorderLevel: 5, category: "Test" });
});

test("the dashboard summary counts products, problems, daily sales and best sellers (FR-14, FR-15)", async () => {
  const userId = (await prisma.user.findUniqueOrThrow({ where: { email: "customer@test.dev" } })).id;
  const [plenty, atLevel, empty] = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const order = (status: "PENDING" | "DELIVERED" | "CANCELLED", total: string, createdAt: Date, productId: number, quantity: number) =>
    prisma.order.create({ data: { userId, status, total, createdAt, items: { create: { productId, quantity, unitPrice: 1 } } } });

  const today = await order("PENDING", "10.00", new Date(), plenty.id, 2);
  await order("CANCELLED", "99.00", new Date(), empty.id, 5); // cancelled: not a sale
  await order("DELIVERED", "4.50", daysAgo(3), atLevel.id, 1);
  await order("DELIVERED", "100.00", daysAgo(20), plenty.id, 1);
  await order("DELIVERED", "500.00", daysAgo(40), empty.id, 9); // older than every period
  await prisma.orderIssue.create({ data: { orderId: today.id, userId, type: "OTHER", message: "Where is my order?" } });

  // Default period: the last 30 days
  const res = await request(app).get("/api/reports/summary").set(auth(adminToken)).expect(200);
  expect(res.body.days).toBe(30);
  expect(res.body.products).toEqual({ total: 3, lowStock: 2, soldOut: 1 });
  expect(res.body.openIssues).toBe(1);
  expect(res.body.thisWeek).toEqual({ orders: 2, revenue: "14.50" }); // today + 3 days ago, not the cancelled one
  expect(res.body.lastWeek).toEqual({ orders: 0, revenue: "0.00" });
  expect(res.body.ordersByStatus).toEqual({ PENDING: 1, SHIPPED: 0, DELIVERED: 2, CANCELLED: 1 });

  const days = res.body.salesByDay;
  expect(days).toHaveLength(30); // every day, also the ones without sales
  expect(days[29]).toMatchObject({ orders: 1, revenue: "10.00" }); // today
  expect(days[26]).toMatchObject({ orders: 1, revenue: "4.50" }); // 3 days ago
  expect(days[9]).toMatchObject({ orders: 1, revenue: "100.00" }); // 20 days ago
  expect(days[0]).toMatchObject({ orders: 0, revenue: "0.00" });
  expect(res.body.bestSellers.map((b: { name: string; sold: number }) => [b.name, b.sold])).toEqual([
    ["Plenty", 3],
    ["At level", 1],
  ]);

  // A shorter period leaves out the order from 20 days ago
  const week = await request(app).get("/api/reports/summary?days=7").set(auth(adminToken)).expect(200);
  expect(week.body.salesByDay).toHaveLength(7);
  expect(week.body.ordersByStatus).toEqual({ PENDING: 1, SHIPPED: 0, DELIVERED: 1, CANCELLED: 1 });
  expect(week.body.bestSellers.map((b: { name: string; sold: number }) => [b.name, b.sold])).toEqual([
    ["Plenty", 2],
    ["At level", 1],
  ]);
});

test("the dashboard period must be 7 to 90 days", async () => {
  for (const days of ["5", "91", "abc"]) {
    const res = await request(app).get(`/api/reports/summary?days=${days}`).set(auth(adminToken)).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  }
});

test("reports are admin-only", async () => {
  for (const url of ["/api/reports/low-stock", "/api/reports/summary"]) {
    await request(app).get(url).expect(401);
    await request(app).get(url).set(auth(customerToken)).expect(403);
  }
});
