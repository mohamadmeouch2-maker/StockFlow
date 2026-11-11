// Sample data (guide 2.4): one admin, one customer, 4 categories and 25 products with photos,
// plus sample reviews, 30 days of sample orders for the admin dashboard and stock alerts.
// Safe to run more than once: nothing is added twice.
// The demo password is for local use only.
import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient, type Product } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uploadRoot } from "../src/lib/uploads";
import { stockAlert } from "../src/modules/notifications/notifications.service";
import { DELIVERY_OPTIONS, deliverBy } from "../src/modules/orders/delivery";

const prisma = new PrismaClient();

// reorderLevel 6 for every product: "Low stock" when fewer than 7 are left.
type SeedProduct = [name: string, description: string | null, price: string, stock: number, reorderLevel: number, photo: string];

// Photos are in prisma/seed-images (credits: prisma/seed-images/CREDITS.md).
const products: Record<string, SeedProduct[]> = {
  Stationery: [
    ["Stapler", "Metal stapler for up to 25 sheets.", "4.50", 40, 6, "stapler.jpg"],
    ["Ballpoint Pens (12 pack)", "Blue ink, medium tip.", "3.20", 120, 6, "ballpoint-pens.jpg"],
    ["A4 Paper (500 sheets)", "80 gsm white copy paper.", "6.99", 4, 6, "a4-paper.jpg"],
    ["Sticky Notes", "Yellow, 76 x 76 mm, 12 pads.", "2.75", 0, 6, "sticky-notes.jpg"],
    ["Highlighter Set", "Four colours.", "5.40", 25, 6, "highlighter-set.jpg"],
    ["Spiral Notebook A5 (3 pack)", "80 lined pages each, perforated.", "5.90", 70, 6, "spiral-notebook.jpg"],
    ["Office Scissors", "21 cm stainless steel blades, soft grip.", "3.50", 35, 6, "office-scissors.jpg"],
    ["Paper Clips (box of 100)", "Mixed colours, 28 mm.", "1.20", 3, 6, "paper-clips.jpg"],
  ],
  Electronics: [
    ["Wireless Mouse", "2.4 GHz with USB receiver.", "18.99", 15, 6, "wireless-mouse.jpg"],
    ["USB Keyboard", "Full size, quiet keys.", "24.50", 3, 6, "usb-keyboard.jpg"],
    ["HDMI Cable 2m", null, "9.99", 60, 6, "hdmi-cable.jpg"],
    ["LED Desk Lamp", "Three brightness levels.", "29.00", 0, 6, "led-desk-lamp.jpg"],
    ["USB Flash Drive 64 GB", "USB 3.2, up to 100 MB/s.", "12.99", 25, 6, "usb-flash-drive.jpg"],
    ["HD Webcam", "1080p with built-in microphone, clips onto any screen.", "39.90", 0, 6, "hd-webcam.jpg"],
    ["Desk Calculator", "12 digits, solar and battery powered.", "14.50", 18, 6, "desk-calculator.jpg"],
  ],
  Furniture: [
    ["Office Chair", "Adjustable height, mesh back.", "149.00", 8, 6, "office-chair.jpg"],
    ["Filing Cabinet", "Three drawers, lockable.", "89.90", 2, 6, "filing-cabinet.jpg"],
    ["Monitor Stand", null, "34.75", 12, 6, "monitor-stand.jpg"],
    ["Bookshelf (5 shelves)", "Oak finish, 180 x 80 cm.", "79.00", 4, 6, "bookshelf.jpg"],
    ["Whiteboard 90 x 60 cm", "Magnetic surface with a pen tray.", "45.00", 6, 6, "whiteboard.jpg"],
  ],
  Cleaning: [
    ["Hand Sanitizer 500ml", "70% alcohol.", "3.99", 80, 6, "hand-sanitizer.jpg"],
    ["Paper Towels (6 rolls)", null, "7.25", 5, 6, "paper-towels.jpg"],
    ["Disinfectant Wipes", "Pack of 80 wipes.", "4.80", 0, 6, "disinfectant-wipes.jpg"],
    ["Glass Cleaner Spray 750 ml", "Streak-free, for windows and screens.", "4.20", 50, 6, "glass-cleaner.jpg"],
    ["Microfiber Cloths (10 pack)", "Washable, 30 x 30 cm.", "6.50", 2, 6, "microfiber-cloths.jpg"],
  ],
};

// Sample reviewers and comments, so every product starts with some ratings (local demo data).
const sampleReviewers: [name: string, email: string][] = [
  ["Sara", "sara@stockflow.test"],
  ["Omar", "omar@stockflow.test"],
  ["Lina", "lina@stockflow.test"],
];
const sampleComments = [
  "Exactly what our office needed.",
  "Good quality for the price.",
  "Arrived quickly and well packed.",
  "Does the job, nothing special.",
  "Works well. I would buy it again.",
  "Solid and well made.",
  "A bit smaller than I expected, but fine.",
  "Great value, the whole team likes it.",
];

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

  // Three sample customers who wrote the sample reviews
  const reviewers = [];
  for (const [name, email] of sampleReviewers) {
    reviewers.push(await prisma.user.upsert({ where: { email }, update: {}, create: { name, email, passwordHash: hash } }));
  }

  let photos = 0;
  let reviews = 0;
  let i = 0;
  const allProducts: Product[] = [];
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
      // Sample views and 2-3 sample reviews, only for products that have none yet.
      // The numbers follow a fixed pattern (not random), so every reset looks the same.
      if (product.viewCount === 0) await prisma.product.update({ where: { id: product.id }, data: { viewCount: 40 + ((i * 37) % 260) } });
      if ((await prisma.review.count({ where: { productId: product.id } })) === 0) {
        for (const [r, reviewer] of reviewers.slice(0, 2 + (i % 2)).entries()) {
          await prisma.review.create({
            data: { productId: product.id, userId: reviewer.id, rating: 6 + ((i * 3 + r * 2) % 5), comment: sampleComments[(i + r * 4) % sampleComments.length] },
          });
          reviews++;
        }
      }
      allProducts.push(product);
      i++;
    }
  }

  // Sample orders from the three sample customers over the last 30 days, so the admin
  // dashboard has sales to show. Added only once (while those customers have no orders).
  // They are history: the stock numbers above are today's stock, so they are not lowered again.
  let orders = 0;
  if ((await prisma.order.count({ where: { userId: { in: reviewers.map((r) => r.id) } } })) === 0) {
    for (let day = 29; day >= 0; day--) {
      // 1 to 3 orders a day in the last two weeks, fewer before that (the shop is growing)
      const ordersThatDay = day < 14 ? 1 + ((day * 5) % 3) : day % 2;
      for (let k = 0; k < ordersThatDay; k++) {
        // 1 to 3 different products, 1 to 3 of each (a fixed pattern again, not random)
        const items = Array.from({ length: 1 + ((day + k) % 3) }, (_, j) => {
          const product = allProducts[(day * 7 + k * 5 + j * 3) % allProducts.length];
          return { productId: product.id, quantity: 1 + ((day + j) % 3), unitPrice: product.price };
        });
        const total = items.reduce((sum, it) => sum.add(it.unitPrice.mul(it.quantity)), new Prisma.Decimal(0));
        // Older orders were delivered (one was cancelled), recent ones are on the way or waiting.
        const status = (day === 9 && k === 0) || day === 21 ? "CANCELLED" : day >= 5 ? "DELIVERED" : day >= 2 ? "SHIPPED" : "PENDING";
        const createdAt = new Date(Date.now() - day * 24 * 60 * 60 * 1000 - (k * 2 + 1) * 60 * 60 * 1000);
        // Every second order of a day chose Express delivery (it costs more and arrives the next day).
        const delivery = k === 1 ? "EXPRESS" : "STANDARD";
        const deliveryFee = DELIVERY_OPTIONS[delivery].fee;
        // When each step happened, for the tracking timeline
        const after = (hours: number) => new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
        const steps =
          status === "CANCELLED"
            ? { cancelledAt: after(2) }
            : status === "SHIPPED"
              ? { shippedAt: after(20) }
              : status === "DELIVERED"
                ? { shippedAt: after(20), deliveredAt: after(delivery === "EXPRESS" ? 24 : 72) }
                : {};
        await prisma.order.create({
          data: {
            userId: reviewers[(day + k) % reviewers.length].id,
            status,
            total: total.add(deliveryFee),
            delivery,
            deliveryFee,
            deliverBy: deliverBy(delivery, createdAt),
            ...steps,
            createdAt,
            items: { create: items },
          },
        });
        orders++;
      }
    }
  }

  // Stock alerts for the products that are already low, so the admin's bell starts with some.
  // Added only while there are no alerts at all. Later alerts come from real orders.
  let alerts = 0;
  if ((await prisma.notification.count()) === 0) {
    const lowProducts = await prisma.product.findMany({ where: { stock: { lte: prisma.product.fields.reorderLevel } }, orderBy: { id: "asc" } });
    for (const product of lowProducts) {
      // As if the last sale took it from above the reorder level down to today's stock.
      const alert = stockAlert(product, product.reorderLevel + 1);
      if (alert) {
        await prisma.notification.create({ data: { ...alert, productId: product.id } });
        alerts++;
      }
    }
  }

  console.log(
    `Seeded: ${await prisma.user.count()} users, ${await prisma.category.count()} categories, ${await prisma.product.count()} products, ` +
      `${photos} photos, ${reviews} reviews, ${orders} orders and ${alerts} stock alerts added`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
