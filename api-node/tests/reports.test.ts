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

test("reports are admin-only", async () => {
  await request(app).get("/api/reports/low-stock").expect(401);
  await request(app).get("/api/reports/low-stock").set(auth(customerToken)).expect(403);
});
