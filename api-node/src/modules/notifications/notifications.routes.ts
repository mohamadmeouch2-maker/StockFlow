import { Router } from "express";
import { notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthUser } from "../../middleware/auth";

// The bell. The same calls for everyone, but each person sees only their own notifications:
//   admins share the store's (userId null): stock alerts (see stockAlert in notifications.service.ts)
//     and customer service messages (see support.routes.ts);
//   a customer sees theirs: order news (see changeStatus in orders.service.ts) and customer service answers.
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

const mine = (user: AuthUser) => ({ userId: user.role === "ADMIN" ? null : user.id });

// The 20 newest notifications and how many are still unread.
notificationsRouter.get("/", async (_req, res) => {
  const where = mine(res.locals.user);
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { ...where, readAt: null } }),
    prisma.notification.findMany({
      where,
      include: { product: { select: { name: true, imageUrl: true } }, ticket: { select: { id: true, topic: true, name: true } } },
      orderBy: { id: "desc" },
      take: 20,
    }),
  ]);
  res.json({ unread, items });
});

// Mark all of mine as read.
notificationsRouter.post("/read-all", async (_req, res) => {
  await prisma.notification.updateMany({ where: { ...mine(res.locals.user), readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

// Mark one as read (when it is opened). Someone else's: the same answer as one that doesn't exist.
notificationsRouter.post("/:id/read", async (req, res) => {
  const id = parseId(req.params.id, "Notification");
  const { count } = await prisma.notification.updateMany({ where: { id, ...mine(res.locals.user) }, data: { readAt: new Date() } });
  if (count === 0) throw notFound("Notification");
  res.status(204).end();
});
