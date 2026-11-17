-- Exchange rates, so the website can show prices in Lebanese pounds or euros.
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('LBP', 'EUR');

-- CreateTable
CREATE TABLE "exchange_rates" (
    "currency" "Currency" NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency")
);

-- Hand-written: a rate is always above zero.
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_rate_check" CHECK ("rate" > 0);

-- Hand-written: starting rates, so the currency button works at once. An admin should check them
-- and keep them up to date on the Dashboard (Exchange rates).
INSERT INTO "exchange_rates" ("currency", "rate", "updated_at") VALUES ('LBP', 89500, NOW()), ('EUR', 0.87, NOW());
