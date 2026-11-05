import { Router } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// FR-11: admins manage categories. Anyone can list them (for the filter dropdown).
const categoryBody = z.object({ name: z.string().trim().min(2).max(100) });

export const categoriesRouter = Router();
const admin = [requireAuth, requireRole("ADMIN")];

categoriesRouter.get("/", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});

// A duplicate name -> Prisma P2002 -> 409 from the error middleware.
categoriesRouter.post("/", ...admin, validate(categoryBody), async (_req, res) => {
  res.status(201).json(await prisma.category.create({ data: res.locals.body }));
});

categoriesRouter.put("/:id", ...admin, validate(categoryBody), async (req, res) => {
  const id = parseId(req.params.id, "Category");
  if (!(await prisma.category.findUnique({ where: { id } }))) throw notFound("Category");
  res.json(await prisma.category.update({ where: { id }, data: res.locals.body }));
});

// FR-11: a category with products cannot be deleted.
categoriesRouter.delete("/:id", ...admin, async (req, res) => {
  const id = parseId(req.params.id, "Category");
  if (!(await prisma.category.findUnique({ where: { id } }))) throw notFound("Category");
  if ((await prisma.product.count({ where: { categoryId: id } })) > 0)
    throw new AppError(409, "CATEGORY_IN_USE", "Category has products");
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
});
