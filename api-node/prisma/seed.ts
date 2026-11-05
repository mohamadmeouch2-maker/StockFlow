// Sample data (guide 2.4): one admin, one customer, 4 categories and 15 products.
// The products are the same as the frontend's mock data.
// Safe to run more than once: nothing is added twice.
// The demo password is for local use only.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products: Record<string, [name: string, description: string | null, price: string, stock: number, reorderLevel: number][]> = {
  Stationery: [
    ["Stapler", "Metal stapler for up to 25 sheets.", "4.50", 40, 10],
    ["Ballpoint Pens (12 pack)", "Blue ink, medium tip.", "3.20", 120, 20],
    ["A4 Paper (500 sheets)", "80 gsm white copy paper.", "6.99", 4, 10],
    ["Sticky Notes", "Yellow, 76 x 76 mm, 12 pads.", "2.75", 0, 5],
    ["Highlighter Set", "Four colours.", "5.40", 25, 5],
  ],
  Electronics: [
    ["Wireless Mouse", "2.4 GHz with USB receiver.", "18.99", 15, 5],
    ["USB Keyboard", "Full size, quiet keys.", "24.50", 3, 5],
    ["HDMI Cable 2m", null, "9.99", 60, 10],
    ["LED Desk Lamp", "Three brightness levels.", "29.00", 0, 5],
  ],
  Furniture: [
    ["Office Chair", "Adjustable height, mesh back.", "149.00", 8, 3],
    ["Filing Cabinet", "Three drawers, lockable.", "89.90", 2, 3],
    ["Monitor Stand", null, "34.75", 12, 3],
  ],
  Cleaning: [
    ["Hand Sanitizer 500ml", "70% alcohol.", "3.99", 80, 15],
    ["Paper Towels (6 rolls)", null, "7.25", 5, 5],
    ["Disinfectant Wipes", "Pack of 80 wipes.", "4.80", 0, 10],
  ],
};

async function main() {
  const hash = await bcrypt.hash("Password1", 10);
  await prisma.user.upsert({
    where: { email: "admin@stockflow.test" },
    update: {},
    create: { name: "Admin", email: "admin@stockflow.test", passwordHash: hash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "customer@stockflow.test" },
    update: {},
    create: { name: "Customer", email: "customer@stockflow.test", passwordHash: hash },
  });

  for (const [categoryName, items] of Object.entries(products)) {
    const category = await prisma.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
    for (const [name, description, price, stock, reorderLevel] of items) {
      const exists = await prisma.product.findFirst({ where: { name } });
      if (!exists) {
        await prisma.product.create({ data: { name, description, price, stock, reorderLevel, categoryId: category.id } });
      }
    }
  }

  console.log(`Seeded: ${await prisma.user.count()} users, ${await prisma.category.count()} categories, ${await prisma.product.count()} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
