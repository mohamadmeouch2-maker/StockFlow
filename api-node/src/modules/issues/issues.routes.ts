import { Router } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../../middleware/auth";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// Customers report a problem with one of their orders; the admin answers and resolves it.

export const reportBody = z.object({
  type: z.enum(["WRONG_ITEM", "DAMAGED", "MISSING_ITEM", "LATE_DELIVERY", "OTHER"]),
  message: z.string().trim().min(10, "Please describe the problem (at least 10 characters)").max(1000),
});
const updateBody = z
  .object({ reply: z.string().trim().min(1).max(1000).optional(), status: z.enum(["OPEN", "RESOLVED"]).optional() })
  .refine((b) => b.reply !== undefined || b.status !== undefined, { message: "Send a reply, a status, or both" });
const listQuery = z.object({ status: z.enum(["OPEN", "RESOLVED"]).optional() });

// Used by POST /api/orders/:id/issues (see orders.routes.ts).
export async function reportIssue(orderId: number, user: AuthUser, body: z.infer<typeof reportBody>) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw notFound("Order");
  if (order.userId !== user.id) throw new AppError(403, "FORBIDDEN", "You can only report problems with your own orders");
  if (await prisma.orderIssue.findFirst({ where: { orderId, status: "OPEN" } }))
    throw new AppError(409, "ISSUE_ALREADY_OPEN", "You already reported a problem with this order. We will answer soon.");
  return prisma.orderIssue.create({ data: { orderId, userId: user.id, type: body.type, message: body.message } });
}

export const issuesRouter = Router();
issuesRouter.use(requireAuth);

// The customer's own reports, newest first.
issuesRouter.get("/mine", async (_req, res) => {
  res.json(
    await prisma.orderIssue.findMany({
      where: { userId: res.locals.user.id },
      include: { order: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
});

// Admin: all reports, open ones first, optionally filtered by status.
issuesRouter.get("/", requireRole("ADMIN"), validate(listQuery, "query"), async (_req, res) => {
  const { status } = res.locals.query;
  res.json(
    await prisma.orderIssue.findMany({
      where: status ? { status } : {},
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { id: true, status: true, total: true, createdAt: true, items: { include: { product: { select: { name: true } } } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }], // OPEN comes before RESOLVED
    }),
  );
});

// Admin: reply and/or change the status (e.g. "Send reply & resolve").
issuesRouter.patch("/:id", requireRole("ADMIN"), validate(updateBody), async (req, res) => {
  const id = parseId(req.params.id, "Problem report");
  if (!(await prisma.orderIssue.findUnique({ where: { id } }))) throw notFound("Problem report");
  const { reply, status } = res.locals.body;
  res.json(await prisma.orderIssue.update({ where: { id }, data: { ...(reply !== undefined && { adminReply: reply }), ...(status && { status }) } }));
});
