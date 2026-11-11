import { Router } from "express";
import { z } from "zod";
import { parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { reportBody, reportIssue } from "../issues/issues.routes";
import { deliveryOptionsJson } from "./delivery";
import { changeStatus, createOrder, withItems } from "./orders.service";

// A phone number like "+961 70 123 456", "03-123456" or "70123456": digits, spaces, dashes and
// an optional "+" at the start, with 7 to 15 digits in all.
const digits = (v: string) => v.replace(/\D/g, "").length;
const isPhone = (v: string) => /^\+?[\d\s-]+$/.test(v) && digits(v) >= 7 && digits(v) <= 15;

const createBody = z.object({
  items: z.array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1) })).min(1),
  delivery: z.enum(["STANDARD", "EXPRESS"]).default("STANDARD"), // how fast; Express costs more
  // Where to bring the order (the website checks the same rules before sending)
  phone: z.string({ error: "Enter a phone number" }).trim().refine(isPhone, { message: "Enter a valid phone number, for example +961 70 123 456" }),
  city: z.string({ error: "Enter the city" }).trim().min(2, "Enter the city").max(60, "At most 60 characters"),
  address: z.string({ error: "Enter the address" }).trim().min(5, "Enter the street, building and floor").max(300, "At most 300 characters"),
});
const statusBody = z.object({ status: z.enum(["SHIPPED", "DELIVERED", "CANCELLED"]) });
const listQuery = z.object({ status: z.enum(["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional() });

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

// The address of my last order, so the cart can fill it in for me. null = none yet.
ordersRouter.get("/last-address", requireRole("CUSTOMER"), async (_req, res) => {
  const last = await prisma.order.findFirst({
    where: { userId: res.locals.user.id, address: { not: null } },
    select: { phone: true, city: true, address: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  res.json(last);
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
