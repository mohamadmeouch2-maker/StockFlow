import request from "supertest";
import { app } from "../src/app";
import { mailer } from "../src/lib/mailer";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// "Tell me when it's back": customers wait for a sold-out product and hear when it is in stock again.
let sara = "";
let omar = "";
let admin = "";
let saraId = 0;
let categoryId = 0;
const send = jest.spyOn(mailer, "send").mockResolvedValue();

beforeAll(async () => {
  await resetDb();
  sara = await createUser("sara@test.dev");
  omar = await createUser("omar@test.dev");
  admin = await createUser("boss@test.dev", "ADMIN");
  saraId = (await prisma.user.findUniqueOrThrow({ where: { email: "sara@test.dev" } })).id;
  categoryId = (await prisma.category.create({ data: { name: "Office" } })).id;
});
afterAll(() => prisma.$disconnect());
afterEach(() => send.mockClear());

const product = (name: string, stock: number) => prisma.product.create({ data: { name, price: 20, stock, categoryId } });
const wait = (token: string, id: number) => request(app).put(`/api/stock-alerts/${id}`).set(auth(token));
const myList = async (token: string) => (await request(app).get("/api/stock-alerts").set(auth(token)).expect(200)).body;
const backInStock = (userId: number) => prisma.notification.findMany({ where: { userId, type: "BACK_IN_STOCK" } });
const restock = (id: number, name: string, stock: number) =>
  request(app).put(`/api/products/${id}`).set(auth(admin)).send({ name, price: 20, stock, categoryId }).expect(200);

test("a customer waits for a sold-out product, sees it in their list, and can stop waiting", async () => {
  const webcam = await product("Webcam", 0);
  await wait(sara, webcam.id).expect(204);
  await wait(sara, webcam.id).expect(204); // twice is fine
  expect(await myList(sara)).toEqual([webcam.id]);
  expect(await myList(omar)).toEqual([]); // only my own list

  await request(app).delete(`/api/stock-alerts/${webcam.id}`).set(auth(sara)).expect(204);
  expect(await myList(sara)).toEqual([]);
});

test("only for sold-out products, only customers", async () => {
  const mouse = await product("Mouse", 5);
  expect((await wait(sara, mouse.id).expect(409)).body.error.code).toBe("IN_STOCK"); // they can buy it now
  await wait(sara, 999999).expect(404);
  await wait(admin, mouse.id).expect(403);
  await request(app).put(`/api/stock-alerts/${mouse.id}`).expect(401);
});

test("restocked by an admin: each waiting customer gets a notification and an email, once", async () => {
  const lamp = await product("Desk Lamp", 0);
  await wait(sara, lamp.id).expect(204);
  await restock(lamp.id, "Desk Lamp", 0); // edited, still sold out: nothing yet
  expect(await backInStock(saraId)).toEqual([]);

  await restock(lamp.id, "Desk Lamp", 12);
  expect(await backInStock(saraId)).toEqual([expect.objectContaining({ message: "Desk Lamp is back in stock", productId: lamp.id, readAt: null })]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0][0]).toMatchObject({ to: "sara@test.dev", subject: "Desk Lamp is back in stock" });
  expect(send.mock.calls[0][0].text).toContain(`/products/${lamp.id}`);
  expect(await myList(sara)).toEqual([]); // no longer waiting

  await restock(lamp.id, "Desk Lamp", 20); // restocked again: no second message
  expect(await backInStock(saraId)).toHaveLength(1);
  expect(send).toHaveBeenCalledTimes(1);
});

test("a cancelled order gives the last pieces back: the waiting customer hears about it", async () => {
  const chair = await product("Chair", 1);
  const { id: orderId } = (
    await request(app)
      .post("/api/orders")
      .set(auth(omar))
      .send({ items: [{ productId: chair.id, quantity: 1 }], ...shipTo })
      .expect(201)
  ).body; // Omar bought the last one: sold out
  await wait(sara, chair.id).expect(204);

  await request(app).patch(`/api/orders/${orderId}/status`).set(auth(admin)).send({ status: "CANCELLED" }).expect(200);
  expect((await backInStock(saraId)).map((n) => n.message)).toContain("Chair is back in stock");
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "sara@test.dev", subject: "Chair is back in stock" }));
});

test("the admins' low-stock list says how many customers wait for each product", async () => {
  const wipes = await product("Wipes", 0);
  await wait(sara, wipes.id).expect(204);
  await wait(omar, wipes.id).expect(204);
  const rows = (await request(app).get("/api/reports/low-stock").set(auth(admin)).expect(200)).body as { name: string; waiting: number }[];
  expect(rows.find((r) => r.name === "Wipes")?.waiting).toBe(2);
  expect(rows.find((r) => r.name === "Webcam")?.waiting).toBe(0);
});
