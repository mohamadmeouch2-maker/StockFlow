import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { createUser, resetDb } from "./helpers";

// "You may also like": bought together first, then the same category, then the most viewed.
const id: Record<string, number> = {};
beforeAll(async () => {
  await resetDb();
  await createUser("buyer@test.dev");
  const userId = (await prisma.user.findUniqueOrThrow({ where: { email: "buyer@test.dev" } })).id;
  const office = (await prisma.category.create({ data: { name: "Office" } })).id;
  const kitchen = (await prisma.category.create({ data: { name: "Kitchen" } })).id;
  const products: [string, number, number, number][] = [
    // name, category, stock, views
    ["Pen", office, 10, 5],
    ["Paper", office, 10, 50],
    ["Stapler", office, 0, 80], // sold out: never suggested
    ["Mug", kitchen, 10, 100],
    ["Kettle", kitchen, 10, 2],
    ["Clips", office, 10, 1],
  ];
  for (const [name, categoryId, stock, viewCount] of products)
    id[name] = (await prisma.product.create({ data: { name, categoryId, stock, viewCount, price: 1 } })).id;

  const order = (names: string[], status: "DELIVERED" | "CANCELLED" = "DELIVERED") =>
    prisma.order.create({
      data: { userId, status, total: names.length, items: { create: names.map((n) => ({ productId: id[n], quantity: 1, unitPrice: 1 })) } },
    });
  await order(["Pen", "Mug"]);
  await order(["Pen", "Mug", "Kettle"]);
  await order(["Pen", "Clips"], "CANCELLED"); // cancelled: not "bought together"
  await order(["Pen", "Stapler"]);
});
afterAll(() => prisma.$disconnect());

const similar = async (name: string) => (await request(app).get(`/api/products/${id[name]}/similar`).expect(200)).body as { name: string }[];

test("bought together most often comes first, then the same category, the most viewed first", async () => {
  // Mug was in 2 orders with the pen, Kettle in 1; then Paper and Clips from the pen's category
  expect((await similar("Pen")).map((p) => p.name)).toEqual(["Mug", "Kettle", "Paper", "Clips"]);
});

test("a product nobody bought yet: its category first, then the shop's most viewed; never itself or a sold-out product", async () => {
  expect((await similar("Paper")).map((p) => p.name)).toEqual(["Pen", "Clips", "Mug", "Kettle"]);
});

test("the suggestions come like the product list (price, sale, rating), and an unknown product is 404", async () => {
  const [first] = await similar("Pen");
  expect(first).toMatchObject({ name: "Mug", salePrice: null, rating: { average: null, count: 0 }, category: { name: "Kitchen" } });
  await request(app).get("/api/products/999999/similar").expect(404);
});
