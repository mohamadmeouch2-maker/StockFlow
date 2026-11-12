import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

let adminToken = "";
let customerToken = "";
let officeId = 0;

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  officeId = (await prisma.category.create({ data: { name: "Office" } })).id;
  const homeId = (await prisma.category.create({ data: { name: "Home" } })).id;
  // 15 office items + 1 home item = 16 products
  for (let i = 1; i <= 15; i++) await prisma.product.create({ data: { name: `Office item ${i}`, price: 5, stock: 10, categoryId: officeId } });
  await prisma.product.create({ data: { name: "Desk Lamp", price: 20, stock: 2, categoryId: homeId } });
});
afterAll(() => prisma.$disconnect());

const validProduct = () => ({ name: "Stapler", price: 4.5, stock: 10, categoryId: officeId });

test("list is paged: 12 per page by default, with the total (FR-04)", async () => {
  const page1 = await request(app).get("/api/products").expect(200);
  expect(page1.body).toMatchObject({ page: 1, pageSize: 12, total: 16 });
  expect(page1.body.items).toHaveLength(12);
  const page2 = await request(app).get("/api/products?page=2").expect(200);
  expect(page2.body.items).toHaveLength(4);
});

test("search ignores upper/lower case and the category filter works (FR-04)", async () => {
  const search = await request(app).get("/api/products?search=DESK").expect(200);
  expect(search.body.items.map((p: { name: string }) => p.name)).toEqual(["Desk Lamp"]);
  const filtered = await request(app).get(`/api/products?categoryId=${officeId}&pageSize=50`).expect(200);
  expect(filtered.body.total).toBe(15);
});

test("product detail includes its category, unknown id is 404 (FR-05)", async () => {
  const lamp = await prisma.product.findFirstOrThrow({ where: { name: "Desk Lamp" } });
  const res = await request(app).get(`/api/products/${lamp.id}`).expect(200);
  expect(res.body.category.name).toBe("Home");
  await request(app).get("/api/products/999999").expect(404);
});

test("only admins can create products: 401 without login, 403 for a customer (FR-03)", async () => {
  await request(app).post("/api/products").send(validProduct()).expect(401);
  await request(app).post("/api/products").set(auth(customerToken)).send(validProduct()).expect(403);
});

test("admin create checks the input, then creates, updates and deletes (FR-11)", async () => {
  const bad = await request(app)
    .post("/api/products")
    .set(auth(adminToken))
    .send({ ...validProduct(), price: 0, stock: -1 })
    .expect(400);
  expect(bad.body.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(["price", "stock"]));

  const created = await request(app).post("/api/products").set(auth(adminToken)).send(validProduct()).expect(201);
  const id = created.body.id;
  const updated = await request(app)
    .put(`/api/products/${id}`)
    .set(auth(adminToken))
    .send({ ...validProduct(), stock: 3 })
    .expect(200);
  expect(updated.body.stock).toBe(3);
  await request(app).delete(`/api/products/${id}`).set(auth(adminToken)).expect(204);
  await request(app).get(`/api/products/${id}`).expect(404);
});

test("a category that still has products cannot be deleted (FR-11)", async () => {
  const res = await request(app).delete(`/api/categories/${officeId}`).set(auth(adminToken)).expect(409);
  expect(res.body.error.code).toBe("CATEGORY_IN_USE");
});
