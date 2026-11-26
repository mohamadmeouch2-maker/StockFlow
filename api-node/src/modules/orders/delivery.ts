import { Prisma, type DeliveryMethod } from "@prisma/client";

type Option = { label: string; fee: Prisma.Decimal; freeFrom: Prisma.Decimal | null; minDays: number; maxDays: number };

// The delivery choices a customer has in the cart. The prices live here on the server,
// so the browser can't change them (like the product prices, FR-08).
// Standard delivery costs $3, and is free when the items come to $60 or more (after any sale discount).
export const DELIVERY_OPTIONS: Record<DeliveryMethod, Option> = {
  STANDARD: { label: "Standard delivery", fee: new Prisma.Decimal("3.00"), freeFrom: new Prisma.Decimal("60.00"), minDays: 3, maxDays: 5 },
  EXPRESS: { label: "Express delivery", fee: new Prisma.Decimal("7.00"), freeFrom: null, minDays: 1, maxDays: 1 },
};

// What this delivery costs for items worth itemsTotal: $0 from the free-delivery amount, else the fee.
export function feeFor(method: DeliveryMethod, itemsTotal: Prisma.Decimal) {
  const { fee, freeFrom } = DELIVERY_OPTIONS[method];
  return freeFrom && itemsTotal.gte(freeFrom) ? new Prisma.Decimal(0) : fee;
}

// The latest day the order should arrive: today + the slowest number of days for that delivery.
export function deliverBy(method: DeliveryMethod, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + DELIVERY_OPTIONS[method].maxDays);
  return date;
}

// The same list as plain JSON for the website:
// [{ id: "STANDARD", label, fee: "3.00", freeFrom: "60.00", minDays, maxDays }, { id: "EXPRESS", ..., freeFrom: null }]
export const deliveryOptionsJson = () =>
  (Object.keys(DELIVERY_OPTIONS) as DeliveryMethod[]).map((id) => {
    const o = DELIVERY_OPTIONS[id];
    return { id, ...o, fee: o.fee.toFixed(2), freeFrom: o.freeFrom?.toFixed(2) ?? null };
  });
