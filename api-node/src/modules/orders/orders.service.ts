import { OrderStatus, Prisma, type DeliveryMethod } from "@prisma/client";
import { AppError, notFound } from "../../lib/errors";
import { salePrice } from "../../lib/pricing";
import { prisma } from "../../lib/prisma";
import type { ShipTo } from "../../lib/shipTo";
import { stockAlert } from "../notifications/notifications.service";
import { DELIVERY_OPTIONS, deliverBy } from "./delivery";

// Order lines come back with the product name, which the website shows.
export const withItems = { items: { include: { product: { select: { name: true } } } } } as const;

// FR-07 / FR-08: one transaction checks and deducts the stock for every line and
// computes the total from the current prices, plus the delivery fee the customer chose.
// If any line fails, nothing changes.
export async function createOrder(userId: number, items: { productId: number; quantity: number }[], delivery: DeliveryMethod, shipTo: ShipTo) {
  // Same product twice in one order -> add the quantities into one line.
  const quantities = new Map<number, number>();
  for (const { productId, quantity } of items) quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  // Always lock products in the same order (by id), so two orders can't block each other forever.
  const lines = [...quantities].sort(([a], [b]) => a - b);

  return prisma.$transaction(async (tx) => {
    let total = new Prisma.Decimal(0); // Decimal, not a JS number: no rounding errors with money
    const orderLines = [];
    for (const [productId, quantity] of lines) {
      // Deduct only if enough stock remains. Two customers buying the last item at the
      // same moment: the database runs these one after the other, so only one gets count = 1.
      const { count } = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      const product = await tx.product.findUnique({ where: { id: productId }, include: { promotion: true } });
      if (!product) throw new AppError(400, "VALIDATION_ERROR", "Invalid input", [{ field: "items", message: `Product ${productId} does not exist` }]);
      if (count === 0) throw new AppError(409, "INSUFFICIENT_STOCK", `Not enough stock for ${product.name} (${product.stock} left)`);
      // During a sale the customer pays the sale price (e.g. 30% off), worked out here on the server
      const unitPrice = salePrice(product) ?? product.price;
      total = total.add(unitPrice.mul(quantity));
      orderLines.push({ productId, quantity, unitPrice });
      // Automatic alert for the admins when this order makes the product low or sold out.
      // It is inside the transaction, so a failed order leaves no alert behind.
      const alert = stockAlert(product, quantity);
      if (alert) await tx.notification.create({ data: { ...alert, productId } });
    }
    // Express costs more and arrives sooner. The fee comes from the server, never from the browser.
    const deliveryFee = DELIVERY_OPTIONS[delivery].fee;
    return tx.order.create({
      data: { userId, total: total.add(deliveryFee), delivery, deliveryFee, deliverBy: deliverBy(delivery), ...shipTo, items: { create: orderLines } },
      include: withItems,
    });
  });
}

// FR-12: the only allowed status changes.
const allowed: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// FR-10 / FR-12. Customers may only cancel their own orders; admins follow the rules above.
export async function changeStatus(orderId: number, next: OrderStatus, actor: { id: number; role: string }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw notFound("Order");
  if (actor.role === "CUSTOMER" && (order.userId !== actor.id || next !== "CANCELLED")) throw new AppError(403, "FORBIDDEN", "Not allowed");
  if (!allowed[order.status].includes(next)) throw new AppError(409, "INVALID_STATUS", `Cannot go from ${order.status} to ${next}`);

  return prisma.$transaction(async (tx) => {
    // Change the status only if nobody changed it in the meantime. This stops a double
    // click on "Cancel" from giving the stock back twice.
    // Also note WHEN it happened, for the customer's tracking timeline.
    const when = { SHIPPED: { shippedAt: new Date() }, DELIVERED: { deliveredAt: new Date() }, CANCELLED: { cancelledAt: new Date() }, PENDING: {} }[next];
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: next, ...when } });
    if (count === 0) throw new AppError(409, "INVALID_STATUS", "The order was changed by someone else, please reload");
    if (next === "CANCELLED") for (const i of order.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } }); // FR-10
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: withItems });
  });
}
