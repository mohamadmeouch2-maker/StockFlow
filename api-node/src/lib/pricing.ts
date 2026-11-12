import type { Prisma } from "@prisma/client";

type Promo = { id: number; name: string; percent: number; endsAt: Date };
type Priced = { price: Prisma.Decimal; promotion?: Promo | null };

// A sale counts only until its end date; after that the normal price is back by itself.
export const activePromotion = (p: Priced, now = new Date()) => (p.promotion && p.promotion.endsAt > now ? p.promotion : null);

// The price after the discount, rounded to cents: $10.00 with 30% off -> $7.00. null = not on sale.
export function salePrice(p: Priced) {
  const promo = activePromotion(p);
  return promo
    ? p.price
        .mul(100 - promo.percent)
        .div(100)
        .toDecimalPlaces(2)
    : null;
}

// What the website gets: the product, plus salePrice ("7.00" or null) and the sale it is in.
export function withSale<T extends Priced>(p: T) {
  const promo = activePromotion(p);
  return {
    ...p,
    promotion: promo ? { id: promo.id, name: promo.name, percent: promo.percent, endsAt: promo.endsAt } : null,
    salePrice: salePrice(p)?.toFixed(2) ?? null,
  };
}
