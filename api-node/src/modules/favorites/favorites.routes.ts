import { Router } from "express";
import { notFound, parseId } from "../../lib/errors";
import { withSale } from "../../lib/pricing";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { ratingsFor } from "../reviews/reviews.routes";

// A customer's favourite products (the heart button), saved to buy later.
export const favoritesRouter = Router();
favoritesRouter.use(requireAuth, requireRole("CUSTOMER"));

// My favourite products, the last one I saved first (with their rating, like the product list).
favoritesRouter.get("/", async (_req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: res.locals.user.id },
    include: { product: { include: { category: true, promotion: true } } },
    orderBy: { createdAt: "desc" },
  });
  const products = favorites.map((f) => f.product);
  const rating = await ratingsFor(products.map((p) => p.id));
  res.json(products.map((p) => ({ ...withSale(p), rating: rating(p.id) })));
});

// Save a product. Saving it twice is fine (nothing changes).
favoritesRouter.put("/:productId", async (req, res) => {
  const productId = parseId(req.params.productId, "Product");
  if (!(await prisma.product.findUnique({ where: { id: productId } }))) throw notFound("Product");
  const userId = res.locals.user.id;
  await prisma.favorite.upsert({ where: { userId_productId: { userId, productId } }, create: { userId, productId }, update: {} });
  res.status(204).end();
});

// Remove a product from my favourites (also fine if it wasn't there).
favoritesRouter.delete("/:productId", async (req, res) => {
  const productId = parseId(req.params.productId, "Product");
  await prisma.favorite.deleteMany({ where: { userId: res.locals.user.id, productId } });
  res.status(204).end();
});
