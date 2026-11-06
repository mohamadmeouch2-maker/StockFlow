import { Router } from "express";
import { z } from "zod";
import { parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { reportBody, reportIssue } from "../issues/issues.routes";
import { changeStatus, createOrder, withItems } from "./orders.service";

const createBody = z.object({
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1) })).min(1),
});
const statusBody = z.object({ status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]) });
const listQuery = z.object({ status: z.enum(["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional() });

export const ordersRouter = Router();
ordersRouter.use(requireAuth); // every orders route needs a login

// FR-07: a customer places an order. The total is computed on the server (FR-08).
ordersRouter.post("/", requireRole("CUSTOMER"), validate(createBody), async (_req, res) => {
  res.status(201).json(await createOrder(res.locals.user.id, res.locals.body.items));
});

// FR-09: only my own orders, newest first, with any problems I reported.
ordersRouter.get("/mine", async (_req, res) => {
  res.json(
    await prisma.order.findMany({
      where: { userId: res.locals.user.id },
      include: { ...withItems, issues: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
  );
});

// The customer reports a problem with one of their orders (wrong item, damaged, ...).
ordersRouter.post("/:id/issues", requireRole("CUSTOMER"), validate(reportBody), async (req, res) => {
  res.status(201).json(await reportIssue(parseId(req.params.id, "Order"), res.locals.user, res.locals.body));
});

// FR-10: cancel a Pending order; the stock comes back.
ordersRouter.post("/:id/cancel", async (req, res) => {
  res.json(await changeStatus(parseId(req.params.id, "Order"), "CANCELLED", res.locals.user));
});

// FR-12: admin sees all orders (with the customer), optionally filtered by status.
ordersRouter.get("/", requireRole("ADMIN"), validate(listQuery, "query"), async (_req, res) => {
  const { status } = res.locals.query;
  res.json(
    await prisma.order.findMany({
      where: status ? { status } : {},
      include: { ...withItems, user: { select: { name: true, email: true } }, issues: { select: { id: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
});

// FR-12: admin moves an order along: Pending -> Shipped -> Delivered, or Pending -> Cancelled.
ordersRouter.patch("/:id/status", requireRole("ADMIN"), validate(statusBody), async (req, res) => {
  res.json(await changeStatus(parseId(req.params.id, "Order"), res.locals.body.status, res.locals.user));
});
