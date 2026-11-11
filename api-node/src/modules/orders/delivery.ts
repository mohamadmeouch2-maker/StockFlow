import { Prisma, type DeliveryMethod } from "@prisma/client";

// The delivery choices a customer has in the cart. The prices live here on the server,
// so the browser can't change them (like the product prices, FR-08).
export const DELIVERY_OPTIONS: Record<DeliveryMethod, { label: string; fee: Prisma.Decimal; minDays: number; maxDays: number }> = {
  STANDARD: { label: "Standard delivery", fee: new Prisma.Decimal("0.00"), minDays: 3, maxDays: 5 },
  EXPRESS: { label: "Express delivery", fee: new Prisma.Decimal("9.99"), minDays: 1, maxDays: 1 },
};

// The latest day the order should arrive: today + the slowest number of days for that delivery.
export function deliverBy(method: DeliveryMethod, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + DELIVERY_OPTIONS[method].maxDays);
  return date;
}

// The same list as plain JSON for the website: [{ id: "EXPRESS", label, fee: "9.99", minDays, maxDays }, ...]
export const deliveryOptionsJson = () =>
  (Object.keys(DELIVERY_OPTIONS) as DeliveryMethod[]).map((id) => ({ id, ...DELIVERY_OPTIONS[id], fee: DELIVERY_OPTIONS[id].fee.toFixed(2) }));
