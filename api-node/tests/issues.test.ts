import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// Customers report problems with their orders; the admin replies and resolves them.
let customerToken = "";
let otherToken = "";
let adminToken = "";
let orderId = 0;

beforeAll(async () => {
  await resetDb();
  customerToken = await createUser("c@test.dev");
  otherToken = await createUser("other@test.dev");
  adminToken = await createUser("admin@test.dev", "ADMIN");
  const categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  const productId = (await prisma.product.create({ data: { name: "Widget", price: 10, stock: 5, categoryId } })).id;
  const res = await request(app).post("/api/orders").set(auth(customerToken)).send({ items: [{ productId, quantity: 1 }], ...shipTo });
  orderId = res.body.id;
});
afterAll(() => prisma.$disconnect());

const report = (token: string, body: object, id = orderId) => request(app).post(`/api/orders/${id}/issues`).set(auth(token)).send(body);
const problem = { type: "DAMAGED", message: "The widget arrived broken in two pieces." };

test("the order's owner can report a problem; it starts OPEN", async () => {
  const res = await report(customerToken, problem).expect(201);
  expect(res.body).toMatchObject({ orderId, type: "DAMAGED", status: "OPEN", adminReply: null });
});

test("only one open report per order", async () => {
  const res = await report(customerToken, problem).expect(409);
  expect(res.body.error.code).toBe("ISSUE_ALREADY_OPEN");
});

test("only the owner can report, and the input is checked", async () => {
  await request(app).post(`/api/orders/${orderId}/issues`).send(problem).expect(401); // not logged in
  await report(otherToken, problem).expect(403); // someone else's order
  await report(adminToken, problem).expect(403); // admins don't report, they answer
  await report(customerToken, problem, 999999).expect(404);
  const bad = await report(customerToken, { type: "BROKEN", message: "short" }).expect(400);
  expect(bad.body.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(["type", "message"]));
});

test("the admin sees the report with the customer and the order, and only admins can", async () => {
  const res = await request(app).get("/api/issues?status=OPEN").set(auth(adminToken)).expect(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0]).toMatchObject({ user: { email: "c@test.dev" }, order: { id: orderId } });
  expect(res.body[0].order.items[0].product.name).toBe("Widget");
  await request(app).get("/api/issues").set(auth(customerToken)).expect(403);
});

test("the admin replies and resolves; the customer sees the answer", async () => {
  const { id } = (await prisma.orderIssue.findFirstOrThrow({ where: { orderId } }));
  await request(app).patch(`/api/issues/${id}`).set(auth(adminToken)).send({}).expect(400); // nothing to change
  await request(app).patch(`/api/issues/${id}`).set(auth(customerToken)).send({ status: "RESOLVED" }).expect(403);

  const res = await request(app)
    .patch(`/api/issues/${id}`)
    .set(auth(adminToken))
    .send({ reply: "Sorry! A new widget is on its way.", status: "RESOLVED" })
    .expect(200);
  expect(res.body).toMatchObject({ status: "RESOLVED", adminReply: "Sorry! A new widget is on its way." });

  const mine = await request(app).get("/api/issues/mine").set(auth(customerToken)).expect(200);
  expect(mine.body[0]).toMatchObject({ status: "RESOLVED", adminReply: "Sorry! A new widget is on its way.", order: { id: orderId } });
  const orders = await request(app).get("/api/orders/mine").set(auth(customerToken)).expect(200);
  expect(orders.body[0].issues[0].status).toBe("RESOLVED");
});

test("after a report is resolved, the customer can report a new problem", async () => {
  await report(customerToken, { type: "OTHER", message: "The replacement has not arrived yet." }).expect(201);
});
