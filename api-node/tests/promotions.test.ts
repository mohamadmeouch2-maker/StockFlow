import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// The sale: 30% off the products in stock that sold fewer than 5 pieces in the last 30 days.
let adminToken = "";
let customerToken = "";
const id: Record<string, number> = {};

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  const userId = (await prisma.user.findUniqueOrThrow({ where: { email: "customer@test.dev" } })).id;
  const categoryId = (await prisma.category.create({ data: { name: "Office" } })).id;
  for (const [name, stock] of [["Best seller", 10], ["Slow", 5], ["Sold out", 0], ["Never sold", 8], ["Old hit", 3]] as const)
    id[name] = (await prisma.product.create({ data: { name, price: 10, stock, categoryId } })).id;
  const sale = (productId: number, quantity: number, daysAgo = 2) =>
    prisma.order.create({
      data: { userId, status: "DELIVERED", total: 10 * quantity, createdAt: new Date(Date.now() - daysAgo * 86400000), items: { create: { productId, quantity, unitPrice: 10 } } },
    });
  await sale(id["Best seller"], 6); // 6 sold: not a slow product
  await sale(id["Slow"], 1); // only 1 sold
  await sale(id["Old hit"], 10, 40); // sold well, but 40 days ago
});
afterAll(() => prisma.$disconnect());

const start = (body: object = {}, token = adminToken) =>
  request(app)
    .post("/api/promotions")
    .set(auth(token))
    .send({ name: "Christmas Sale", percent: 30, endsAt: `${new Date().getFullYear() + 1}-12-31`, maxSold: 5, days: 30, ...body });
const product = async (pid: number) => (await request(app).get(`/api/products/${pid}`).expect(200)).body;

test("no sale at first", async () => {
  expect((await request(app).get("/api/promotions/current").expect(200)).body).toBeNull();
});

test("the sale picks the products in stock that sold fewer than 5 pieces in 30 days", async () => {
  const res = await start().expect(201);
  expect(res.body.products.map((p: { name: string }) => p.name)).toEqual(["Never sold", "Old hit", "Slow"]); // not "Best seller", not "Sold out"
  expect(res.body.promotion).toMatchObject({ name: "Christmas Sale", percent: 30, productCount: 3 });
  const current = (await request(app).get("/api/promotions/current").expect(200)).body;
  expect(current).toMatchObject({ name: "Christmas Sale", percent: 30, productCount: 3 });
});

test("sale products show the sale price; the others don't", async () => {
  expect(await product(id["Slow"])).toMatchObject({ price: "10", salePrice: "7.00", promotion: { name: "Christmas Sale", percent: 30 } });
  expect(await product(id["Best seller"])).toMatchObject({ salePrice: null, promotion: null });
  const deals = (await request(app).get("/api/products?onSale=true").expect(200)).body;
  expect(deals.items.map((p: { name: string }) => p.name)).toEqual(["Never sold", "Old hit", "Slow"]);
});

test("an order pays the sale price (calculated on the server)", async () => {
  const res = await request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId: id["Slow"], quantity: 2 }], ...shipTo }).expect(201);
  expect(Number(res.body.items[0].unitPrice)).toBe(7);
  expect(Number(res.body.total)).toBe(14);
});

test("only one sale at a time, and the input is checked", async () => {
  expect((await start().expect(409)).body.error.code).toBe("SALE_ALREADY_ON");
  await start({ percent: 95 }).expect(400);
  await start({ endsAt: "2020-01-01" }).expect(400);
  await start({}, customerToken).expect(403);
});

test("ending the sale brings the normal prices back", async () => {
  const { id: saleId } = (await request(app).get("/api/promotions/current")).body;
  await request(app).delete(`/api/promotions/${saleId}`).set(auth(adminToken)).expect(204);
  expect(await product(id["Slow"])).toMatchObject({ salePrice: null, promotion: null });
  expect((await request(app).get("/api/promotions/current")).body).toBeNull();
  await request(app).delete(`/api/promotions/${saleId}`).set(auth(adminToken)).expect(404); // already ended
});
