import type { Prisma } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { withSale } from "../../lib/pricing";
import { prisma } from "../../lib/prisma";
import { deleteUpload, productImageUpload } from "../../lib/uploads";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ratingsFor } from "../reviews/reviews.routes";

// FR-04: ?page=1&pageSize=12&search=&categoryId=  plus  &sort=price_asc&inStock=true
const SORTS = ["name", "price_asc", "price_desc", "rating", "newest"] as const;
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().optional(),
  sort: z.enum(SORTS).default("name"),
  inStock: z.enum(["true", "false"]).optional(), // "true" = hide sold-out products
  onSale: z.enum(["true", "false"]).optional(), // "true" = only the products in a sale that is on
});

// How each sort orders the rows (the name breaks ties, so the order is always the same).
const orderBy: Record<Exclude<(typeof SORTS)[number], "rating">, Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }],
  price_asc: [{ price: "asc" }, { name: "asc" }],
  price_desc: [{ price: "desc" }, { name: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
};

// FR-11: what an admin sends to create or update a product.
const productBody = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(6), // Low stock = fewer than 7 left, unless the admin sets another number
  categoryId: z.number().int(),
});

// A clear 400 instead of a database error when the category doesn't exist.
const checkCategory = async (categoryId: number) => {
  if (!(await prisma.category.findUnique({ where: { id: categoryId } })))
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "categoryId", message: "Category does not exist" }]);
};

export const productsRouter = Router();
const admin = [requireAuth, requireRole("ADMIN")];

productsRouter.get("/", validate(listQuery, "query"), async (_req, res) => {
  const { page, pageSize, search, categoryId, sort, inStock, onSale } = res.locals.query as z.infer<typeof listQuery>;
  const where: Prisma.ProductWhereInput = {
    ...(search && { name: { contains: search, mode: "insensitive" as const } }), // case-insensitive
    ...(categoryId && { categoryId }),
    ...(inStock === "true" && { stock: { gt: 0 } }),
    ...(onSale === "true" && { promotion: { endsAt: { gt: new Date() } } }),
  };

  let items;
  let total;
  if (sort === "rating") {
    // The average rating is not a column, so the database can't sort by it. Instead: take the
    // matching products' ids, get their averages, sort them here, then load only this page.
    // (Fine for a shop of this size; a big shop would store the average in the products table.)
    const all = await prisma.product.findMany({ where, select: { id: true, name: true } });
    const ratings = await ratingsFor(all.map((p) => p.id));
    const score = (id: number) => ratings(id).average ?? -1; // not rated yet -> last
    all.sort((a, b) => score(b.id) - score(a.id) || ratings(b.id).count - ratings(a.id).count || a.name.localeCompare(b.name));
    const pageIds = all.slice((page - 1) * pageSize, page * pageSize).map((p) => p.id);
    const rows = await prisma.product.findMany({ where: { id: { in: pageIds } }, include: { category: true, promotion: true } });
    items = pageIds.map((id) => rows.find((p) => p.id === id)!);
    total = all.length;
  } else {
    [items, total] = await prisma.$transaction([
      prisma.product.findMany({ where, include: { category: true, promotion: true }, orderBy: orderBy[sort], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.product.count({ where }),
    ]);
  }
  const rating = await ratingsFor(items.map((p) => p.id)); // average rating / 10 for each product
  res.json({ items: items.map((p) => ({ ...withSale(p), rating: rating(p.id) })), page, pageSize, total }); // withSale: the sale price, if any
});

// FR-05
productsRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id, "Product");
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true, promotion: true } });
  if (!product) throw notFound("Product");
  res.json({ ...withSale(product), rating: (await ratingsFor([id]))(id) });
});

// Counts one view of the product page. The website calls it once per visit.
productsRouter.post("/:id/view", async (req, res) => {
  const id = parseId(req.params.id, "Product");
  await prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } }); // missing product -> 404
  res.status(204).end();
});

productsRouter.post("/", ...admin, validate(productBody), async (_req, res) => {
  await checkCategory(res.locals.body.categoryId);
  const product = await prisma.product.create({ data: res.locals.body, include: { category: true } });
  res.status(201).json(product);
});

productsRouter.put("/:id", ...admin, validate(productBody), async (req, res) => {
  const id = parseId(req.params.id, "Product");
  if (!(await prisma.product.findUnique({ where: { id } }))) throw notFound("Product");
  await checkCategory(res.locals.body.categoryId);
  const product = await prisma.product.update({ where: { id }, data: res.locals.body, include: { category: true } });
  res.json(product);
});

// A product that appears in orders can't be deleted: the error middleware returns 409.
productsRouter.delete("/:id", ...admin, async (req, res) => {
  const id = parseId(req.params.id, "Product");
  const product = await prisma.product.delete({ where: { id } });
  deleteUpload(product.imageUrl); // its photo goes too
  res.status(204).end();
});

// FR-17: photos. The product must exist before a file is accepted.
const loadProduct = async (req: Request, res: Response, next: NextFunction) => {
  const id = parseId(req.params.id, "Product");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound("Product");
  res.locals.product = product;
  next();
};

// Upload or replace the photo: multipart/form-data with one file in the "image" field.
productsRouter.post("/:id/image", ...admin, loadProduct, productImageUpload, async (req, res) => {
  if (!req.file) throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "image", message: "Choose an image file" }]);
  const imageUrl = `/uploads/products/${req.file.filename}`;
  try {
    const product = await prisma.product.update({ where: { id: res.locals.product.id }, data: { imageUrl }, include: { category: true } });
    deleteUpload(res.locals.product.imageUrl); // the old photo is no longer needed
    res.json(product);
  } catch (err) {
    deleteUpload(imageUrl); // don't keep a file that no product points to
    throw err;
  }
});

productsRouter.delete("/:id/image", ...admin, loadProduct, async (_req, res) => {
  const product = await prisma.product.update({ where: { id: res.locals.product.id }, data: { imageUrl: null }, include: { category: true } });
  deleteUpload(res.locals.product.imageUrl);
  res.json(product);
});
