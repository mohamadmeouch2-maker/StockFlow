import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { MAX_QUESTIONS_PER_HOUR } from "../src/modules/assistant/assistant.routes";
import { ollama, type OllamaMessage, type OllamaReply, type OllamaTool } from "../src/modules/assistant/ollama";
import { runTool } from "../src/modules/assistant/tools";
import { auth, createUser, resetDb, shipTo } from "./helpers";

// The assistant. The AI itself (Ollama) is replaced by answers written here, so the tests check what
// the server does: which tools each person gets, what the tools return, and the error cases.
const chat = jest.spyOn(ollama, "chat");
const toolCall = (name: string, args: Record<string, unknown> = {}): OllamaReply => ({ content: "", tool_calls: [{ function: { name, arguments: args } }] });
const answer = (content: string): OllamaReply => ({ content });

let sara = "";
let omar = "";
let admin = "";
let saraId = 0;
let pen = 0;
beforeAll(async () => {
  await resetDb();
  sara = await createUser("sara@test.dev");
  omar = await createUser("omar@test.dev");
  admin = await createUser("boss@test.dev", "ADMIN");
  saraId = (await prisma.user.findUniqueOrThrow({ where: { email: "sara@test.dev" } })).id;
  const categoryId = (await prisma.category.create({ data: { name: "Office" } })).id;
  pen = (await prisma.product.create({ data: { name: "Blue Pen", price: 2, stock: 50, categoryId } })).id;
  await prisma.product.create({ data: { name: "Desk Chair", price: 80, stock: 3, reorderLevel: 6, categoryId } });
  await request(app)
    .post("/api/orders")
    .set(auth(sara))
    .send({ items: [{ productId: pen, quantity: 2 }], ...shipTo })
    .expect(201);
});
afterAll(() => prisma.$disconnect());
afterEach(() => chat.mockReset());

const ask = (token: string, question: string, language = "en") =>
  request(app)
    .post("/api/assistant/chat")
    .set(auth(token))
    .send({ messages: [{ role: "user", content: question }], language });
const toolNames = (tools: OllamaTool[]) => tools.map((t) => t.function.name).sort();

test("the assistant needs a login, and a question to answer", async () => {
  await request(app)
    .post("/api/assistant/chat")
    .send({ messages: [{ role: "user", content: "Hi" }] })
    .expect(401);
  await request(app)
    .post("/api/assistant/chat")
    .set(auth(sara))
    .send({ messages: [{ role: "assistant", content: "Hello" }] })
    .expect(400); // the last message must be the question
  await ask(sara, "x".repeat(1001)).expect(400);
  expect(chat).not.toHaveBeenCalled();
});

test("a customer's question: the AI searches the products, the answer comes back with links to them", async () => {
  chat.mockResolvedValueOnce(toolCall("search_products", { query: "pen" })).mockResolvedValueOnce(answer("We have the Blue Pen for $2.00."));
  const res = await ask(sara, "Do you sell pens?").expect(200);
  expect(res.body).toEqual({ reply: "We have the Blue Pen for $2.00.", products: [{ id: pen, name: "Blue Pen" }] });

  chat.mockReset();
  chat.mockResolvedValueOnce(toolCall("search_products", { query: "pen" })).mockResolvedValueOnce(answer("Sorry, I found nothing for that."));
  expect((await ask(sara, "Any pens?").expect(200)).body.products).toEqual([]); // found, but not named in the answer: no link

  chat.mockReset();
  chat.mockResolvedValueOnce(toolCall("search_products", { query: "pen" })).mockResolvedValueOnce(answer("We have the Blue Pen for $2.00."));
  await ask(sara, "Do you sell pens?").expect(200);
  const [first, tools] = chat.mock.calls[0];
  expect(toolNames(tools)).toEqual(["list_categories", "my_orders", "search_products"]); // no shop numbers for customers
  expect(first[0]).toMatchObject({ role: "system" });
  expect(first[0].content).toContain("Always answer in English");
  // The second round sees what the tool found
  const toolMessage = chat.mock.calls[1][0].at(-1) as Extract<OllamaMessage, { role: "tool" }>;
  expect(toolMessage).toMatchObject({ role: "tool", tool_name: "search_products" });
  expect(JSON.parse(toolMessage.content)).toEqual([{ id: pen, name: "Blue Pen", category: "Office", price: "$2.00", stock: "in stock" }]);
});

test("the products on sale: only a sale that has not ended, also when the AI searches for the word 'sale'", async () => {
  const categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Office" } })).id;
  const ended = await prisma.promotion.create({ data: { name: "Summer Sale", percent: 50, endsAt: new Date(Date.now() - 86_400_000) } });
  const running = await prisma.promotion.create({ data: { name: "Christmas Sale", percent: 30, endsAt: new Date(Date.now() + 86_400_000) } });
  const paper = await prisma.product.create({ data: { name: "Printer Paper", price: 10, stock: 20, categoryId, promotionId: running.id } });
  const stapler = await prisma.product.create({ data: { name: "Stapler", price: 6, stock: 20, categoryId, promotionId: ended.id } });
  const who = { id: saraId, role: "CUSTOMER" as const };

  const onSale = [expect.objectContaining({ name: "Printer Paper", price: "$7.00", normal_price: "$10.00", sale: "-30%" })];
  expect(await runTool({ function: { name: "search_products", arguments: { on_sale_only: true } } }, who)).toEqual(onSale);
  expect(await runTool({ function: { name: "search_products", arguments: { query: "sale" } } }, who)).toEqual(onSale);
  expect(await runTool({ function: { name: "search_products", arguments: { query: "Discounts" } } }, who)).toEqual(onSale);

  await prisma.product.deleteMany({ where: { id: { in: [paper.id, stapler.id] } } });
  await prisma.promotion.deleteMany({ where: { id: { in: [ended.id, running.id] } } });
});

test("the answer uses the website's language", async () => {
  chat.mockResolvedValueOnce(answer("مرحبا"));
  await ask(sara, "مرحبا", "ar").expect(200);
  expect(chat.mock.calls[0][0][0].content).toContain("Always answer in Arabic");
});

test("a customer only ever sees their own orders, whatever the AI asks", async () => {
  chat.mockResolvedValueOnce(toolCall("my_orders", { user_id: saraId })).mockResolvedValueOnce(answer("You have no orders."));
  await ask(omar, "Where is my order?").expect(200);
  const result = JSON.parse((chat.mock.calls[1][0].at(-1) as { content: string }).content);
  expect(result).toEqual({ orders: [], note: "This customer has no orders yet." }); // Omar's, not Sara's

  chat.mockReset();
  chat.mockResolvedValueOnce(toolCall("my_orders")).mockResolvedValueOnce(answer("Your order is pending."));
  await ask(sara, "Where is my order?").expect(200);
  const orders = JSON.parse((chat.mock.calls[1][0].at(-1) as { content: string }).content);
  expect(orders).toEqual([expect.objectContaining({ status: "pending", items: "2 × Blue Pen", total: "$4.00", delivery: "standard" })]);
});

test("a customer can't use the admins' tools, even if the AI asks for them", async () => {
  chat.mockResolvedValueOnce(toolCall("sales_summary", { days: 30 })).mockResolvedValueOnce(answer("I can't see that."));
  await ask(sara, "How much did the shop sell?").expect(200);
  expect(JSON.parse((chat.mock.calls[1][0].at(-1) as { content: string }).content)).toEqual({ error: "This tool is not available." });
});

test("admins get the shop's numbers: low stock, sales and the orders to ship", async () => {
  chat.mockResolvedValueOnce(answer("Hello"));
  await ask(admin, "Hello").expect(200);
  expect(toolNames(chat.mock.calls[0][1])).toEqual(["list_categories", "low_stock", "orders_to_ship", "sales_summary", "search_products"]);

  const who = { id: 1, role: "ADMIN" as const };
  const categoryId = (await prisma.category.findFirstOrThrow({ where: { name: "Office" } })).id;
  const printer = await prisma.product.create({ data: { name: "Label Printer", price: 30, stock: 0, categoryId } });
  expect(await runTool({ function: { name: "low_stock", arguments: {} } }, who)).toEqual({
    count: 2,
    sold_out: 1,
    products: [
      { name: "Label Printer", stock: 0, reorder_level: 6, status: "sold out" }, // the most urgent first
      { name: "Desk Chair", stock: 3, reorder_level: 6, status: "low" },
    ],
  });
  await prisma.product.delete({ where: { id: printer.id } });
  expect(await runTool({ function: { name: "sales_summary", arguments: { days: 7 } } }, who)).toEqual({
    days: 7,
    orders: 1,
    revenue: "$4",
    best_sellers: [{ name: "Blue Pen", sold: 2 }],
  });
  expect(await runTool({ function: { name: "orders_to_ship", arguments: {} } }, who)).toEqual([
    expect.objectContaining({ customer: "sara", items: "2 × Blue Pen", delivery: "standard" }),
  ]);
  expect(await runTool({ function: { name: "search_products", arguments: { max_price: 10 } } }, who)).toHaveLength(1); // the chair is $80
});

test("reasoning between <think> tags is not shown", async () => {
  chat.mockResolvedValueOnce(answer("<think>The user wants pens.</think>\nYes, we sell pens."));
  expect((await ask(sara, "Pens?").expect(200)).body.reply).toBe("Yes, we sell pens.");
  chat.mockResolvedValueOnce(answer("Okay, the user wants pens. Let me answer.\n</think>\n\nWe sell the Blue Pen."));
  expect((await ask(sara, "Pens?").expect(200)).body.reply).toBe("We sell the Blue Pen."); // reasoning without the opening tag
});

test("without Ollama running, the assistant says it is not available", async () => {
  chat.mockRestore(); // the real call to Ollama...
  const fetchSpy = jest.spyOn(global, "fetch").mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:11434"));
  const quiet = jest.spyOn(console, "error").mockImplementation(() => {});
  const res = await ask(sara, "Hello").expect(503);
  expect(res.body.error).toMatchObject({ code: "ASSISTANT_OFFLINE", message: "The assistant is not available right now. Please try again later." });
  fetchSpy.mockRestore();
  quiet.mockRestore();
  jest.spyOn(ollama, "chat"); // (the spy is created again for the next tests)
});

test(`each person can ask ${MAX_QUESTIONS_PER_HOUR} questions an hour`, async () => {
  const spy = jest.spyOn(ollama, "chat").mockResolvedValue(answer("OK"));
  // Omar asked once above (and the questions of other people don't count for him)
  for (let i = 1; i < MAX_QUESTIONS_PER_HOUR; i++) await ask(omar, `Question ${i}`).expect(200);
  const res = await ask(omar, "One too many").expect(429);
  expect(res.body.error.code).toBe("TOO_MANY_QUESTIONS");
  await ask(admin, "Still fine for others").expect(200);
  spy.mockReset();
});
