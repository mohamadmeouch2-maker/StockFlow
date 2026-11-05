import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

// FR-16: products whose stock is at or below their reorder level, so the admin restocks in time.
// (The guide puts reports in the .NET API, which is out of scope, so this one lives here.)
export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("ADMIN"));

reportsRouter.get("/low-stock", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { stock: { lte: prisma.product.fields.reorderLevel } }, // compares two columns of the same row
    include: { category: true },
    orderBy: [{ stock: "asc" }, { name: "asc" }], // most urgent first
  });
  res.json(products.map((p) => ({ productId: p.id, name: p.name, category: p.category.name, stock: p.stock, reorderLevel: p.reorderLevel })));
});
