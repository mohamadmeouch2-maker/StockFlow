// Sample data (guide 2.4): one admin, one customer, 4 categories and 15 products with photos.
// Safe to run more than once: nothing is added twice.
// The demo password is for local use only.
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uploadRoot } from "../src/lib/uploads";

const prisma = new PrismaClient();

type SeedProduct = [name: string, description: string | null, price: string, stock: number, reorderLevel: number, photo: string];

// Photos are in prisma/seed-images (credits: prisma/seed-images/CREDITS.md).
const products: Record<string, SeedProduct[]> = {
  Stationery: [
    ["Stapler", "Metal stapler for up to 25 sheets.", "4.50", 40, 10, "stapler.jpg"],
    ["Ballpoint Pens (12 pack)", "Blue ink, medium tip.", "3.20", 120, 20, "ballpoint-pens.jpg"],
    ["A4 Paper (500 sheets)", "80 gsm white copy paper.", "6.99", 4, 10, "a4-paper.jpg"],
    ["Sticky Notes", "Yellow, 76 x 76 mm, 12 pads.", "2.75", 0, 5, "sticky-notes.jpg"],
    ["Highlighter Set", "Four colours.", "5.40", 25, 5, "highlighter-set.jpg"],
  ],
  Electronics: [
    ["Wireless Mouse", "2.4 GHz with USB receiver.", "18.99", 15, 5, "wireless-mouse.jpg"],
    ["USB Keyboard", "Full size, quiet keys.", "24.50", 3, 5, "usb-keyboard.jpg"],
    ["HDMI Cable 2m", null, "9.99", 60, 10, "hdmi-cable.jpg"],
    ["LED Desk Lamp", "Three brightness levels.", "29.00", 0, 5, "led-desk-lamp.jpg"],
  ],
  Furniture: [
    ["Office Chair", "Adjustable height, mesh back.", "149.00", 8, 3, "office-chair.jpg"],
    ["Filing Cabinet", "Three drawers, lockable.", "89.90", 2, 3, "filing-cabinet.jpg"],
    ["Monitor Stand", null, "34.75", 12, 3, "monitor-stand.jpg"],
  ],
  Cleaning: [
    ["Hand Sanitizer 500ml", "70% alcohol.", "3.99", 80, 15, "hand-sanitizer.jpg"],
    ["Paper Towels (6 rolls)", null, "7.25", 5, 5, "paper-towels.jpg"],
    ["Disinfectant Wipes", "Pack of 80 wipes.", "4.80", 0, 10, "disinfectant-wipes.jpg"],
  ],
};

// Copies a sample photo into the uploads folder, the same place uploaded photos go (FR-17).
function copyPhoto(file: string) {
  const dir = path.join(uploadRoot, "products");
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, "seed-images", file), path.join(dir, `seed-${file}`));
  return `/uploads/products/seed-${file}`;
}

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

  let photos = 0;
  for (const [categoryName, items] of Object.entries(products)) {
    const category = await prisma.category.upsert({ where: { name: categoryName }, update: {}, create: { name: categoryName } });
    for (const [name, description, price, stock, reorderLevel, photo] of items) {
      const product =
        (await prisma.product.findFirst({ where: { name } })) ??
        (await prisma.product.create({ data: { name, description, price, stock, reorderLevel, categoryId: category.id } }));
      // Only products without a photo get the sample one, so photos uploaded by an admin are kept.
      if (!product.imageUrl) {
        await prisma.product.update({ where: { id: product.id }, data: { imageUrl: copyPhoto(photo) } });
        photos++;
      }
    }
  }

  console.log(
    `Seeded: ${await prisma.user.count()} users, ${await prisma.category.count()} categories, ${await prisma.product.count()} products, ${photos} photos added`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
