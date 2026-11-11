import { Router } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// FR-11: admins manage categories. Anyone can list them (for the category buttons and the product form).
const categoryBody = z.object({ name: z.string().trim().min(2, "At least 2 characters").max(100) });

export const categoriesRouter = Router();
const admin = [requireAuth, requireRole("ADMIN")];

// "Stationery" and "stationery" are the same category. (The database's unique rule is
// case-sensitive, so this check runs first; the unique rule stays as the last guard -> 409.)
async function checkNameFree(name: string, exceptId?: number) {
  const taken = await prisma.category.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: exceptId ? { id: exceptId } : undefined } });
  if (taken) throw new AppError(409, "CATEGORY_EXISTS", "Already exists", [{ field: "name", message: `"${taken.name}" already exists` }]);
}

// All categories A-Z, with how many products each one has.
categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  res.json(categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
});

categoriesRouter.post("/", ...admin, validate(categoryBody), async (_req, res) => {
  await checkNameFree(res.locals.body.name);
  res.status(201).json(await prisma.category.create({ data: res.locals.body }));
});

// Rename. The products keep their category, so they move along with the new name.
categoriesRouter.put("/:id", ...admin, validate(categoryBody), async (req, res) => {
  const id = parseId(req.params.id, "Category");
  if (!(await prisma.category.findUnique({ where: { id } }))) throw notFound("Category");
  await checkNameFree(res.locals.body.name, id);
  res.json(await prisma.category.update({ where: { id }, data: res.locals.body }));
});

// FR-11: a category with products cannot be deleted.
categoriesRouter.delete("/:id", ...admin, async (req, res) => {
  const id = parseId(req.params.id, "Category");
  if (!(await prisma.category.findUnique({ where: { id } }))) throw notFound("Category");
  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products > 0)
    throw new AppError(409, "CATEGORY_IN_USE", `This category still has ${products} product${products === 1 ? "" : "s"}. Move or delete them first.`);
  await prisma.category.delete({ where: { id } });
  res.status(204).end();
});
