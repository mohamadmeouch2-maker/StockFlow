import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { uploadRoot } from "../src/lib/uploads";
import { auth, createUser, resetDb } from "./helpers";

// FR-17: product photos. Files go to UPLOAD_DIR from .env.test, never the real uploads folder.
let adminToken = "";
let customerToken = "";
let productId = 0;

// The smallest valid PNG: a 1 x 1 pixel image.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fileOnDisk = (imageUrl: string) => path.join(uploadRoot, "products", path.basename(imageUrl));
const upload = (token: string, file: Buffer, name: string, id = productId) =>
  request(app).post(`/api/products/${id}/image`).set(auth(token)).attach("image", file, name);

beforeAll(async () => {
  await resetDb();
  adminToken = await createUser("admin@test.dev", "ADMIN");
  customerToken = await createUser("customer@test.dev");
  const categoryId = (await prisma.category.create({ data: { name: "Test" } })).id;
  productId = (await prisma.product.create({ data: { name: "Camera", price: 99, stock: 3, categoryId } })).id;
});
afterAll(async () => {
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  await prisma.$disconnect();
});

test("admin uploads a photo; it is saved and served as an image", async () => {
  const res = await upload(adminToken, png, "camera.png").expect(200);
  expect(res.body.imageUrl).toMatch(new RegExp(`^/uploads/products/product-${productId}-\\d+\\.png$`));
  expect(fs.existsSync(fileOnDisk(res.body.imageUrl))).toBe(true);

  const image = await request(app).get(res.body.imageUrl).expect(200);
  expect(image.headers["content-type"]).toBe("image/png");
  expect((await request(app).get(`/api/products/${productId}`)).body.imageUrl).toBe(res.body.imageUrl);
});

test("a new photo replaces the old one, and the old file is deleted", async () => {
  const old = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).imageUrl!;
  await new Promise((r) => setTimeout(r, 5)); // new file name (it includes the time)
  const res = await upload(adminToken, png, "camera2.png").expect(200);
  expect(res.body.imageUrl).not.toBe(old);
  await new Promise((r) => setTimeout(r, 50));
  expect(fs.existsSync(fileOnDisk(old))).toBe(false);
});

test("only admins can upload photos", async () => {
  await request(app).post(`/api/products/${productId}/image`).attach("image", png, "x.png").expect(401);
  await upload(customerToken, png, "x.png").expect(403);
});

test("rejects files that are not photos, files that are too big, and missing files", async () => {
  const text = await upload(adminToken, Buffer.from("not an image"), "notes.txt").expect(400);
  expect(text.body.error.details[0]).toEqual({ field: "image", message: "Use a JPG, PNG, WebP or GIF image" });

  const big = await upload(adminToken, Buffer.alloc(3 * 1024 * 1024), "big.png").expect(400);
  expect(big.body.error.details[0].message).toBe("The image must be 2 MB or smaller");

  await request(app).post(`/api/products/${productId}/image`).set(auth(adminToken)).expect(400);
  await upload(adminToken, png, "x.png", 999999).expect(404);
});

test("removing the photo clears it and deletes the file", async () => {
  const current = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).imageUrl!;
  const res = await request(app).delete(`/api/products/${productId}/image`).set(auth(adminToken)).expect(200);
  expect(res.body.imageUrl).toBeNull();
  await new Promise((r) => setTimeout(r, 50));
  expect(fs.existsSync(fileOnDisk(current))).toBe(false);
});
