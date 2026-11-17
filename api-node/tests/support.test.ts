import request from "supertest";
import { app } from "../src/app";
import { mailer } from "../src/lib/mailer";
import { prisma } from "../src/lib/prisma";
import { VISITOR_LIMIT } from "../src/modules/support/support.routes";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// Customer service: customers and visitors write, admins answer, both sides can keep writing.
const sent = jest.spyOn(mailer, "send").mockResolvedValue(); // no real emails in the tests

let sara = "";
let omar = "";
let admin = "";
let saraOrder = 0;
beforeAll(async () => {
  await resetDb();
  sara = await createUser("sara@test.dev");
  omar = await createUser("omar@test.dev");
  admin = await createUser("boss@test.dev", "ADMIN");
  const category = await prisma.category.create({ data: { name: "Office" } });
  const product = await prisma.product.create({ data: { name: "Pen", price: 2, stock: 50, categoryId: category.id } });
  const order = await request(app)
    .post("/api/orders")
    .set(auth(sara))
    .send({ items: [{ productId: product.id, quantity: 1 }], ...shipTo })
    .expect(201);
  saraOrder = order.body.id;
});
afterAll(() => prisma.$disconnect());

const write = (body: object, token?: string) => {
  const req = request(app).post("/api/support");
  return (token ? req.set(auth(token)) : req).send(body);
};
const reply = (id: number, body: object, token: string) => request(app).post(`/api/support/${id}/messages`).set(auth(token)).send(body);
const mine = (token: string) => request(app).get("/api/support/mine").set(auth(token));
const all = (query = "") => request(app).get(`/api/support${query}`).set(auth(admin));

let ticketId = 0;

test("a customer writes about one of their orders; the account's name and email are used", async () => {
  const res = await write({ topic: "DELIVERY", orderId: saraOrder, message: "When will my order arrive, please?" }, sara).expect(201);
  expect(res.body).toMatchObject({ topic: "DELIVERY", status: "OPEN", name: "sara", email: "sara@test.dev", orderId: saraOrder, customerUnread: false });
  expect(res.body.messages).toEqual([
    { id: expect.any(Number), author: "CUSTOMER", body: "When will my order arrive, please?", createdAt: expect.any(String) },
  ]);
  expect(res.body.order).toMatchObject({ id: saraOrder, status: "PENDING", items: [{ quantity: 1, product: { name: "Pen" } }] });
  ticketId = res.body.id;
});

test("bad input gets one message per field, and nobody can pick someone else's order", async () => {
  const bad = await write({ topic: "WHATEVER", message: "short" }, sara).expect(400);
  expect(bad.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(["message", "topic"]);
  const notMine = await write({ topic: "ORDER", orderId: saraOrder, message: "This is about Sara's order, not mine." }, omar).expect(400);
  expect(notMine.body.error.details).toEqual([{ field: "orderId", message: "Choose one of your orders" }]);
});

test("a visitor who can't sign in can write with a name and an email", async () => {
  const missing = await write({ topic: "SIGN_IN", message: "I can't log in to my account." }).expect(400);
  expect(missing.body.error.details).toEqual([
    { field: "name", message: "Enter your name" },
    { field: "email", message: "Enter your email, so we can answer you" },
  ]);
  const res = await write({ topic: "SIGN_IN", name: "Nadia", email: " Nadia@Mail.dev ", message: "I can't log in to my account." }).expect(201);
  expect(res.body).toMatchObject({ userId: null, name: "Nadia", email: "nadia@mail.dev", status: "OPEN" });
});

test("admins answer on their own page and can't open a conversation as a customer", async () => {
  await write({ topic: "OTHER", message: "Admins don't write here." }, admin).expect(403);
});

test("customers see only their own conversations; the admin sees all, waiting ones first", async () => {
  expect((await mine(sara).expect(200)).body.map((t: { id: number }) => t.id)).toEqual([ticketId]);
  expect((await mine(omar).expect(200)).body).toEqual([]);
  await request(app).get("/api/support").set(auth(sara)).expect(403);
  await request(app).get("/api/support").expect(401);
  const list = await all("?status=OPEN").expect(200);
  expect(list.body).toHaveLength(2);
});

test("the admin's answer: the customer gets 'new reply' and an email, and the conversation waits for the customer", async () => {
  const res = await reply(ticketId, { message: "It ships tomorrow <b>morning</b>." }, admin).expect(201);
  expect(res.body).toMatchObject({ status: "ANSWERED", customerUnread: true });
  expect(res.body.messages.map((m: { author: string }) => m.author)).toEqual(["CUSTOMER", "STAFF"]);
  const mail = sent.mock.calls.at(-1)![0];
  expect(mail).toMatchObject({ to: "sara@test.dev", subject: "StockFlow customer service: we answered your message" });
  expect(mail.text).toContain("It ships tomorrow <b>morning</b>.");
  expect(mail.html).toContain("It ships tomorrow &lt;b&gt;morning&lt;/b&gt;."); // an answer can't add HTML to the email

  expect((await mine(sara)).body[0].customerUnread).toBe(true);
  await request(app).post("/api/support/read").set(auth(sara)).expect(204);
  expect((await mine(sara)).body[0].customerUnread).toBe(false);
});

test("the customer writes back: the conversation waits for the store again, even after it was solved", async () => {
  await reply(ticketId, { message: "Thanks! All good now.", resolve: true }, admin).expect(201);
  expect((await all("?status=RESOLVED")).body.map((t: { id: number }) => t.id)).toContain(ticketId);
  const res = await reply(ticketId, { message: "Sorry, one more question: can I change the address?" }, sara).expect(201);
  expect(res.body).toMatchObject({ status: "OPEN", customerUnread: false });
  expect(res.body.messages).toHaveLength(4);
});

test("nobody can write in someone else's conversation", async () => {
  await reply(ticketId, { message: "Let me in" }, omar).expect(404);
  await reply(9999, { message: "Hello" }, admin).expect(404);
  await reply(ticketId, { message: "   " }, sara).expect(400);
});

test("the admin can mark a conversation solved or reopen it without writing", async () => {
  const solved = await request(app).patch(`/api/support/${ticketId}`).set(auth(admin)).send({ status: "RESOLVED" }).expect(200);
  expect(solved.body.status).toBe("RESOLVED");
  await request(app).patch(`/api/support/${ticketId}`).set(auth(sara)).send({ status: "OPEN" }).expect(403);
});

test("an answer is saved even if the email can't be sent", async () => {
  sent.mockRejectedValueOnce(new Error("SMTP down"));
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  await reply(ticketId, { message: "We are looking into it." }, admin).expect(201);
  expect(error).toHaveBeenCalled();
  error.mockRestore();
});

test(`a visitor can start at most ${VISITOR_LIMIT} conversations an hour from one computer`, async () => {
  // One was already sent above ("I can't log in")
  for (let i = 1; i < VISITOR_LIMIT; i++)
    await write({ topic: "OTHER", name: "Spam", email: "spam@mail.dev", message: `Message number ${i} here` }).expect(201);
  const blocked = await write({ topic: "OTHER", name: "Spam", email: "spam@mail.dev", message: "One message too many" }).expect(429);
  expect(blocked.body.error.code).toBe("TOO_MANY_MESSAGES");
  await write({ topic: "OTHER", message: "Logged-in customers have no limit." }, omar).expect(201);
});

test("every new customer message rings the admins' bell once; an answer or 'solved' marks it read", async () => {
  const bell = async () => (await request(app).get("/api/notifications").set(auth(admin)).expect(200)).body;
  const before = (await bell()).unread;
  const t = (await write({ topic: "RETURN", message: "I want to return the pen, please." }, omar).expect(201)).body;
  let now = await bell();
  expect(now.unread).toBe(before + 1);
  expect(now.items[0]).toMatchObject({
    type: "SUPPORT_MESSAGE",
    message: "New message from omar: Returns",
    productId: null,
    ticketId: t.id,
    ticket: { id: t.id, topic: "RETURN", name: "omar" },
  });

  await reply(t.id, { message: "Hello? Is anyone there?" }, omar).expect(201); // the first ring is still unread: no second one
  expect((await bell()).unread).toBe(before + 1);

  await reply(t.id, { message: "Yes! Give it to the delivery person." }, admin).expect(201); // answered: read
  expect((await bell()).unread).toBe(before);

  await reply(t.id, { message: "Thanks, one more question." }, omar).expect(201); // rings again after an answer
  now = await bell();
  expect(now.unread).toBe(before + 1);
  expect(now.items[0].message).toBe("omar wrote again: Returns");

  await request(app).patch(`/api/support/${t.id}`).set(auth(admin)).send({ status: "RESOLVED" }).expect(200); // solved: read
  expect((await bell()).unread).toBe(before);
});

test("an admin's answer rings the customer's bell; opening Customer service marks it read; visitors have no bell", async () => {
  const sarasBell = async () => (await request(app).get("/api/notifications").set(auth(sara)).expect(200)).body;
  const t = (await write({ topic: "PAYMENT", message: "Can I pay with a card?" }, sara).expect(201)).body;
  const before = (await sarasBell()).unread;

  await reply(t.id, { message: "Yes, when the order arrives." }, admin).expect(201);
  await reply(t.id, { message: "Any card works." }, admin).expect(201); // still unread: no second ring
  let bell = await sarasBell();
  expect(bell.unread).toBe(before + 1);
  expect(bell.items[0]).toMatchObject({ type: "SUPPORT_ANSWER", message: "Customer service answered your message about Payments and cards", ticketId: t.id });

  await request(app).post("/api/support/read").set(auth(sara)).expect(204); // Sara opened Customer service
  bell = await sarasBell();
  expect(bell.unread).toBe(0);

  const visitor = await prisma.supportTicket.findFirstOrThrow({ where: { userId: null } });
  const count = await prisma.notification.count({ where: { type: "SUPPORT_ANSWER" } });
  await reply(visitor.id, { message: "We sent you an email." }, admin).expect(201);
  expect(await prisma.notification.count({ where: { type: "SUPPORT_ANSWER" } })).toBe(count);
});
