import type { Prisma, SupportTicket, SupportTopic } from "@prisma/client";
import { Router, type Response } from "express";
import { z } from "zod";
import { AppError, notFound, parseId } from "../../lib/errors";
import { escapeHtml, mailer } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";
import { optionalAuth, requireAuth, requireRole, type AuthUser } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { nameRule } from "../auth/auth.routes";

// Customer service: customers (and visitors who can't log in) write to the store about signing in,
// orders, delivery, returns, payments and cards, or changes. The admins answer, and the two sides
// can keep writing back and forth until the conversation is solved.
// The bells: every new message from a customer rings the admins' bell (SUPPORT_MESSAGE), and an
// admin's answer marks that as read and rings the customer's bell (SUPPORT_ANSWER). Visitors have no bell.

export const TOPICS = ["SIGN_IN", "ORDER", "DELIVERY", "RETURN", "PAYMENT", "CHANGE", "OTHER"] as const;
export const topicLabels: Record<SupportTopic, string> = {
  SIGN_IN: "Signing in and my account",
  ORDER: "An order",
  DELIVERY: "Delivery",
  RETURN: "Returns",
  PAYMENT: "Payments and cards",
  CHANGE: "Change or cancel an order",
  OTHER: "Something else",
};

const newTicketBody = z.object({
  topic: z.enum(TOPICS, "Choose a topic"),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000, "At most 2000 characters"),
  orderId: z.number().int().positive().optional(), // logged-in customers: the order it is about
  // Visitors who are not logged in: who they are, and where to send the answer
  name: nameRule.optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional(),
});
const replyBody = z.object({
  message: z.string().trim().min(1, "Write a message").max(2000, "At most 2000 characters"),
  resolve: z.boolean().optional(), // admins: send the answer and mark the conversation solved
});
const statusBody = z.object({ status: z.enum(["OPEN", "ANSWERED", "RESOLVED"]) });
const listQuery = z.object({ status: z.enum(["OPEN", "ANSWERED", "RESOLVED"]).optional() });

// What a conversation looks like in the answers: its messages (oldest first) and the order it is about.
const withMessages = {
  messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, author: true, body: true, createdAt: true } },
  order: { select: { id: true, status: true, total: true, createdAt: true, items: { select: { quantity: true, product: { select: { name: true } } } } } },
} satisfies Prisma.SupportTicketInclude;

// Visitors can't be recognised by an account, so new conversations from one computer (IP address)
// are limited: 5 an hour. Logged-in customers have no limit. The counts live in memory.
export const VISITOR_LIMIT = 5;
const HOUR = 60 * 60 * 1000;
const visitorPosts = new Map<string, number[]>();
function limitVisitor(ip: string, res: Response, now = Date.now()) {
  const recent = (visitorPosts.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= VISITOR_LIMIT) {
    const minutes = Math.ceil((recent[0] + HOUR - now) / 60_000);
    res.setHeader("Retry-After", String(minutes * 60));
    throw new AppError(429, "TOO_MANY_MESSAGES", `You sent many messages in a short time. Please try again in ${minutes} minutes, or log in.`);
  }
  recent.push(now);
  visitorPosts.set(ip, recent);
}

export const supportRouter = Router();

// Write to Customer service. Logged in: the account's name and email are used, and an order can be chosen.
// A visitor (e.g. "I can't sign in") types a name and an email; the answer is emailed to them.
supportRouter.post("/", optionalAuth, validate(newTicketBody), async (req, res) => {
  const body = res.locals.body as z.infer<typeof newTicketBody>;
  const me = res.locals.user as AuthUser | undefined;
  if (me?.role === "ADMIN") throw new AppError(403, "FORBIDDEN", "Admins answer the messages on the Customer service admin page");

  let from: { userId: number | null; name: string; email: string };
  if (me) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    from = { userId: user.id, name: user.name, email: user.email };
    if (body.orderId !== undefined) {
      const order = await prisma.order.findUnique({ where: { id: body.orderId }, select: { userId: true } });
      const message = "Choose one of your orders";
      if (order?.userId !== me.id) throw new AppError(400, "VALIDATION_ERROR", message, [{ field: "orderId", message }]);
    }
  } else {
    const details = [];
    if (!body.name) details.push({ field: "name", message: "Enter your name" });
    if (!body.email) details.push({ field: "email", message: "Enter your email, so we can answer you" });
    if (body.orderId !== undefined) details.push({ field: "orderId", message: "Log in to choose an order, or write its number in the message" });
    if (details.length) throw new AppError(400, "VALIDATION_ERROR", "Invalid input", details);
    limitVisitor(req.ip ?? "unknown", res);
    from = { userId: null, name: body.name!, email: body.email! };
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ...from,
      topic: body.topic,
      orderId: body.orderId ?? null,
      messages: { create: { author: "CUSTOMER", body: body.message } },
      notifications: { create: { type: "SUPPORT_MESSAGE", message: `New message from ${from.name}: ${topicLabels[body.topic]}` } }, // the admins' bell
    },
    include: withMessages,
  });
  res.status(201).json(ticket);
});

supportRouter.use(requireAuth);

// My conversations (customers), the most recent first. "customerUnread": the store answered and I haven't seen it.
supportRouter.get("/mine", async (_req, res) => {
  res.json(await prisma.supportTicket.findMany({ where: { userId: res.locals.user.id }, include: withMessages, orderBy: { updatedAt: "desc" } }));
});

// I have seen the answers (the Customer service page calls this after showing them).
// The answers in the customer's bell are read too.
supportRouter.post("/read", async (_req, res) => {
  const userId = res.locals.user.id;
  await prisma.$transaction([
    prisma.supportTicket.updateMany({ where: { userId, customerUnread: true }, data: { customerUnread: false } }),
    prisma.notification.updateMany({ where: { userId, type: "SUPPORT_ANSWER", readAt: null }, data: { readAt: new Date() } }),
  ]);
  res.status(204).end();
});

// Admin: every conversation. Waiting for us first, then answered, then solved; the most recent first in each.
supportRouter.get("/", requireRole("ADMIN"), validate(listQuery, "query"), async (_req, res) => {
  const { status } = res.locals.query;
  res.json(
    await prisma.supportTicket.findMany({ where: status ? { status } : {}, include: withMessages, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] }),
  );
});

// A new message in a conversation.
//   Customer (only in their own conversations): the conversation waits for the store again, even if it was solved.
//   Admin: the answer for the store. The customer sees "New reply" and gets an email.
supportRouter.post("/:id/messages", validate(replyBody), async (req, res) => {
  const id = parseId(req.params.id, "Conversation");
  const me = res.locals.user as AuthUser;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  // Someone else's conversation: the same answer as one that doesn't exist
  if (!ticket || (me.role === "CUSTOMER" && ticket.userId !== me.id)) throw notFound("Conversation");
  const { message, resolve } = res.locals.body as z.infer<typeof replyBody>;
  const staff = me.role === "ADMIN";

  // Whose bell this message rings: a customer's message rings the admins' bell (userId null), an admin's
  // answer rings the customer's. Only once while the last ring for this conversation is unread. Visitors have no bell.
  const bell = staff ? ticket.userId : null;
  const ringing = (!staff || bell !== null) && !(await prisma.notification.findFirst({ where: { ticketId: id, userId: bell, readAt: null } }));
  const topic = topicLabels[ticket.topic];
  const ring = staff
    ? { type: "SUPPORT_ANSWER" as const, message: `Customer service answered your message about ${topic}` }
    : { type: "SUPPORT_MESSAGE" as const, message: `${ticket.name} wrote again: ${topic}` };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({ data: { ticketId: id, author: staff ? "STAFF" : "CUSTOMER", body: message } });
    // An admin answered: the admins' ring for this conversation is dealt with
    if (staff) await tx.notification.updateMany({ where: { ticketId: id, userId: null, readAt: null }, data: { readAt: new Date() } });
    if (ringing) await tx.notification.create({ data: { ...ring, ticketId: id, userId: bell } });
    return tx.supportTicket.update({
      where: { id },
      data: staff ? { status: resolve ? "RESOLVED" : "ANSWERED", customerUnread: ticket.userId !== null } : { status: "OPEN", customerUnread: false },
      include: withMessages,
    });
  });
  if (staff) await emailAnswer(ticket, message);
  res.status(201).json(updated);
});

// Admin: change the status without writing, e.g. "Mark solved" or "Reopen".
// Solved (or answered): its bell notification is marked as read too.
supportRouter.patch("/:id", requireRole("ADMIN"), validate(statusBody), async (req, res) => {
  const id = parseId(req.params.id, "Conversation");
  if (!(await prisma.supportTicket.findUnique({ where: { id } }))) throw notFound("Conversation");
  const { status } = res.locals.body as z.infer<typeof statusBody>;
  const updated = await prisma.supportTicket.update({ where: { id }, data: { status }, include: withMessages });
  if (status !== "OPEN") await prisma.notification.updateMany({ where: { ticketId: id, userId: null, readAt: null }, data: { readAt: new Date() } });
  res.json(updated);
});

// Emails the store's answer to the customer. A failed email doesn't undo the answer: customers with an
// account also see it on the website. (Without Gmail settings the email is printed in the API window.)
async function emailAnswer(ticket: SupportTicket, answer: string) {
  const page = `${process.env.CORS_ORIGIN ?? "http://localhost:5173"}/help`;
  const how = ticket.userId ? `To answer us, log in and open Customer service: ${page}` : `To write to us again, open Customer service: ${page}`;
  const topic = topicLabels[ticket.topic];
  const text = [`Hi ${ticket.name},`, "", `We answered your message about "${topic}":`, "", answer, "", how, "", "StockFlow customer service"].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
  <h2 style="color:#2563eb;margin-bottom:4px">StockFlow</h2>
  <p>Hi ${escapeHtml(ticket.name)},</p>
  <p>We answered your message about <b>${escapeHtml(topic)}</b>:</p>
  <p style="background:#eff6ff;border-radius:8px;padding:12px;white-space:pre-line">${escapeHtml(answer)}</p>
  <p><a href="${page}" style="color:#2563eb">${ticket.userId ? "Log in and open Customer service" : "Open Customer service"}</a> to write to us again.</p>
  <p style="color:#64748b;font-size:13px">StockFlow customer service</p>
</div>`;
  try {
    await mailer.send({ to: ticket.email, subject: `StockFlow customer service: we answered your message`, text, html });
  } catch (err) {
    console.error("Could not email the answer:", err);
  }
}
