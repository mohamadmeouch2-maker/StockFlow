import { Router } from "express";
import { z } from "zod";
import { parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { shipToFields } from "../../lib/shipTo";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { reportBody, reportIssue } from "../issues/issues.routes";
import { deliveryOptionsJson } from "./delivery";
import { changeStatus, createOrder, withItems } from "./orders.service";

const createBody = z.object({
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1) })).min(1),
  delivery: z.enum(["STANDARD", "EXPRESS"]).default("STANDARD"), // how fast; Express costs more
  ...shipToFields, // where to bring the order: phone, city, address
});
const statusBody = z.object({ status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]) });
// Admin list: one page at a time (20 orders by default), so it stays fast with thousands of orders
const listQuery = z.object({
  status: z.enum(["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ordersRouter = Router();
ordersRouter.use(requireAuth); // every orders route needs a login

// FR-07: a customer places an order. The total is computed on the server (FR-08).
ordersRouter.post("/", requireRole("CUSTOMER"), validate(createBody), async (_req, res) => {
  const { items, delivery, phone, city, address } = res.locals.body;
  res.status(201).json(await createOrder(res.locals.user.id, items, delivery, { phone, city, address }));
});

// The delivery choices for the cart: Standard (free, 3-5 days) or Express (extra fee, next day).
ordersRouter.get("/delivery-options", (_req, res) => {
  res.json(deliveryOptionsJson());
});

// The address the cart fills in for me: the one saved in My account, or else the one of my
// last order. { phone, city, address, from: "account" | "last-order" }, or null = none yet.
ordersRouter.get("/saved-address", requireRole("CUSTOMER"), async (_req, res) => {
  const select = { phone: true, city: true, address: true } as const;
  const me = await prisma.user.findUniqueOrThrow({ where: { id: res.locals.user.id }, select });
  if (me.address) return void res.json({ ...me, from: "account" });
  const last = await prisma.order.findFirst({
    where: { userId: res.locals.user.id, address: { not: null } },
    select,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(last && { ...last, from: "last-order" });
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

// FR-12: admin sees all orders (with the customer), newest first, optionally filtered by status.
// ?page=2&pageSize=20 -> { items, page, pageSize, total } (the same shape as the product list)
ordersRouter.get("/", requireRole("ADMIN"), validate(listQuery, "query"), async (_req, res) => {
  const { status, page, pageSize } = res.locals.query as z.infer<typeof listQuery>;
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: { ...withItems, user: { select: { name: true, email: true } }, issues: { select: { id: true, status: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  res.json({ items, page, pageSize, total });
});

// FR-12: admin moves an order along: Pending -> Shipped -> Delivered, or Pending -> Cancelled.
ordersRouter.patch("/:id/status", requireRole("ADMIN"), validate(statusBody), async (req, res) => {
  res.json(await changeStatus(parseId(req.params.id, "Order"), res.locals.body.status, res.locals.user));
});
