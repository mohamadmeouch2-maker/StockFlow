import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb } from "./helpers";

// FR-11: admins manage categories; a category with products cannot be deleted.
let adminToken = "";
let customerToken = "";
let officeId = 0;

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  officeId = (await prisma.category.create({ data: { name: "Office" } })).id;
  await prisma.product.createMany({
    data: [
      { name: "Stapler", price: 4, stock: 5, categoryId: officeId },
      { name: "Pens", price: 2, stock: 5, categoryId: officeId },
    ],
  });
});
afterAll(() => prisma.$disconnect());

const create = (name: string, token = adminToken) => request(app).post("/api/categories").set(auth(token)).send({ name });

test("anyone can list the categories A-Z, with how many products each has", async () => {
  await create("Cleaning").expect(201);
  const res = await request(app).get("/api/categories").expect(200);
  expect(res.body.map((c: { name: string; productCount: number }) => [c.name, c.productCount])).toEqual([
    ["Cleaning", 0],
    ["Office", 2],
  ]);
});

test("a name that already exists is refused, even with other capital letters", async () => {
  const res = await create("office").expect(409);
  expect(res.body.error.details).toEqual([{ field: "name", message: '"Office" already exists' }]);
  await create("x").expect(400); // too short
});

test("admins rename a category; its products stay in it", async () => {
  const res = await request(app).put(`/api/categories/${officeId}`).set(auth(adminToken)).send({ name: "Office supplies" }).expect(200);
  expect(res.body.name).toBe("Office supplies");
  expect(await prisma.product.count({ where: { categoryId: officeId } })).toBe(2);
  // Renaming to another category's name is refused, but keeping its own name (other capitals) is fine
  await request(app).put(`/api/categories/${officeId}`).set(auth(adminToken)).send({ name: "cleaning" }).expect(409);
  await request(app).put(`/api/categories/${officeId}`).set(auth(adminToken)).send({ name: "OFFICE SUPPLIES" }).expect(200);
});

test("a category with products can't be deleted; an empty one can (FR-11)", async () => {
  const inUse = await request(app).delete(`/api/categories/${officeId}`).set(auth(adminToken)).expect(409);
  expect(inUse.body.error).toMatchObject({ code: "CATEGORY_IN_USE", message: "This category still has 2 products. Move or delete them first." });

  const empty = (await create("Garden").expect(201)).body.id;
  await request(app).delete(`/api/categories/${empty}`).set(auth(adminToken)).expect(204);
  await request(app).delete(`/api/categories/${empty}`).set(auth(adminToken)).expect(404);
});

test("only admins change categories", async () => {
  await create("Toys", customerToken).expect(403);
  await request(app).post("/api/categories").send({ name: "Toys" }).expect(401);
  await request(app).delete(`/api/categories/${officeId}`).set(auth(customerToken)).expect(403);
});
