import { Router } from "express";
import { notFound, parseId } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

// Stock alerts for the admins (the bell in the admin menu). They are created
// automatically when orders take products down (see stockAlert in notifications.service.ts).
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth, requireRole("ADMIN"));

// The 20 newest alerts and how many are still unread.
notificationsRouter.get("/", async (_req, res) => {
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { readAt: null } }),
    prisma.notification.findMany({
      include: { product: { select: { name: true, imageUrl: true } } },
      orderBy: { id: "desc" },
      take: 20,
    }),
  ]);
  res.json({ unread, items });
});

// Mark every alert as read.
notificationsRouter.post("/read-all", async (_req, res) => {
  await prisma.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  res.status(204).end();
});

// Mark one alert as read (when the admin opens it).
notificationsRouter.post("/:id/read", async (req, res) => {
  const id = parseId(req.params.id, "Notification");
  const { count } = await prisma.notification.updateMany({ where: { id }, data: { readAt: new Date() } });
  if (count === 0) throw notFound("Notification");
  res.status(204).end();
});
