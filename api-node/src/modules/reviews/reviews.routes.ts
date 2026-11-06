import { Router, type Request } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// Product reviews: a rating from 1 to 10 and an optional comment.
// Mounted at /api/products/:id/reviews (mergeParams gives us the product :id).
export const reviewsRouter = Router({ mergeParams: true });

const reviewBody = z.object({
  rating: z.number().int("Pick a whole number").min(1, "From 1 to 10").max(10, "From 1 to 10"),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((c) => c || null), // an empty comment is saved as "no comment"
});

// Average (one decimal) and number of ratings for some products, e.g. { 3: { average: 8.5, count: 12 } }.
export async function ratingsFor(productIds: number[]) {
  const rows = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map(rows.map((r) => [r.productId, { average: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count._all }]));
  return (id: number) => map.get(id) ?? { average: null, count: 0 };
}

const productId = async (raw: string | string[]) => {
  const id = parseId(raw, "Product");
  if (!(await prisma.product.findUnique({ where: { id } }))) throw notFound("Product");
  return id;
};

// A customer may rate a product once they have ordered it (any order that wasn't cancelled).
const hasBought = async (userId: number, id: number) =>
  Boolean(await prisma.orderItem.findFirst({ where: { productId: id, order: { userId, status: { not: "CANCELLED" } } } }));

// Everyone can read the reviews, newest first.
// (The :id comes from the parent path, so TypeScript needs to be told it's there.)
reviewsRouter.get("/", async (req: Request<{ id: string }>, res) => {
  const id = await productId(req.params.id);
  const reviews = await prisma.review.findMany({
    where: { productId: id },
    include: { user: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  res.json({
    ...(await ratingsFor([id]))(id),
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

// The logged-in customer: may I review this product, and what did I write before?
reviewsRouter.get("/me", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const id = await productId(req.params.id);
  const userId = res.locals.user.id;
  res.json({
    canReview: await hasBought(userId, id),
    review: await prisma.review.findUnique({ where: { productId_userId: { productId: id, userId } } }),
  });
});

// Add or change my review.
reviewsRouter.put("/", requireAuth, requireRole("CUSTOMER"), validate(reviewBody), async (req, res) => {
  const id = await productId(req.params.id);
  const userId = res.locals.user.id;
  if (!(await hasBought(userId, id))) throw new AppError(403, "NOT_PURCHASED", "You can rate a product after you buy it");
  const { rating, comment } = res.locals.body;
  res.json(
    await prisma.review.upsert({
      where: { productId_userId: { productId: id, userId } },
      create: { productId: id, userId, rating, comment },
      update: { rating, comment },
    }),
  );
});

// Remove my review.
reviewsRouter.delete("/", requireAuth, requireRole("CUSTOMER"), async (req, res) => {
  const id = await productId(req.params.id);
  const { count } = await prisma.review.deleteMany({ where: { productId: id, userId: res.locals.user.id } });
  if (count === 0) throw notFound("Review");
  res.status(204).end();
});
