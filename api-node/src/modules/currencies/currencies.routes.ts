import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

// The currencies the website can show prices in. Prices and orders are always in US dollars;
// the website converts them for display with these rates, which an admin keeps up to date.
export const currenciesRouter = Router();

const CURRENCIES = ["LBP", "EUR"] as const;
const rateBody = z.object({ rate: z.coerce.number().positive("Must be above 0").max(1_000_000, "At most 1,000,000") });

// Anyone: every currency with how much of it 1 US dollar is. USD is always 1.
currenciesRouter.get("/", async (_req, res) => {
  const rates = await prisma.exchangeRate.findMany({ orderBy: { currency: "asc" } });
  res.json([{ currency: "USD", rate: "1", updatedAt: null }, ...rates]);
});

// Admin: a new rate, e.g. PUT /api/currencies/LBP { "rate": 89500 }
currenciesRouter.put("/:currency", requireAuth, requireRole("ADMIN"), validate(rateBody), async (req, res) => {
  const currency = CURRENCIES.find((c) => c === req.params.currency);
  if (!currency) throw notFound("Currency");
  const { rate } = res.locals.body as z.infer<typeof rateBody>;
  res.json(await prisma.exchangeRate.upsert({ where: { currency }, create: { currency, rate }, update: { rate } }));
});
