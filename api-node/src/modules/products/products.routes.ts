import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { deleteUpload, productImageUpload } from "../../lib/uploads";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// FR-04: ?page=1&pageSize=12&search=&categoryId=
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().optional(),
});

// FR-11: what an admin sends to create or update a product.
const productBody = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).default(5),
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
  const { page, pageSize, search, categoryId } = res.locals.query;
  const where = {
    ...(search && { name: { contains: search, mode: "insensitive" as const } }), // case-insensitive
    ...(categoryId && { categoryId }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { category: true }, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);
  res.json({ items, page, pageSize, total });
});

// FR-05
productsRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id, "Product");
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) throw notFound("Product");
  res.json(product);
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
  if (!req.file)
    throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "image", message: "Choose an image file" }]);
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
