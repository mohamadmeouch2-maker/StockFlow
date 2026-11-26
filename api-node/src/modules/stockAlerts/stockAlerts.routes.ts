import { Router } from "express";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

// "Tell me when it's back" (customers): the sold-out products I wait for.
export const stockAlertsRouter = Router();
stockAlertsRouter.use(requireAuth, requireRole("CUSTOMER"));

// The ids of the products I wait for, e.g. [21, 9]
stockAlertsRouter.get("/", async (_req, res) => {
  const alerts = await prisma.stockAlert.findMany({ where: { userId: res.locals.user.id }, select: { productId: true } });
  res.json(alerts.map((a) => a.productId));
});

// Wait for a sold-out product. Asking twice is fine (nothing changes).
stockAlertsRouter.put("/:productId", async (req, res) => {
  const productId = parseId(req.params.productId, "Product");
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
  if (!product) throw notFound("Product");
  if (product.stock > 0) throw new AppError(409, "IN_STOCK", "This product is in stock: you can buy it now");
  const userId = res.locals.user.id;
  await prisma.stockAlert.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
  res.status(204).end();
});

// Stop waiting (also fine if I wasn't).
stockAlertsRouter.delete("/:productId", async (req, res) => {
  const productId = parseId(req.params.productId, "Product");
  await prisma.stockAlert.deleteMany({ where: { userId: res.locals.user.id, productId } });
  res.status(204).end();
});
