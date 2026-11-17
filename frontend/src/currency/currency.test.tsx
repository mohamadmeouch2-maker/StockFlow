import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { currenciesApi, type ExchangeRate } from "../api/currencies";
import { CurrencySelect } from "../components/CurrencySelect";
import { Price } from "../components/Price";
import { RatesCard } from "../components/RatesCard";
import { CurrencyProvider } from "./CurrencyProvider";
import { formatMoney } from "./money";

const rates: ExchangeRate[] = [
  { currency: "USD", rate: "1", updatedAt: null },
  { currency: "EUR", rate: "0.8700", updatedAt: "2026-11-17T08:00:00Z" },
  { currency: "LBP", rate: "89500", updatedAt: "2026-11-17T08:00:00Z" }, // as the API sends it: no decimals
];
beforeEach(() => vi.spyOn(currenciesApi, "list").mockResolvedValue(rates));
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const withProviders = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CurrencyProvider>{ui}</CurrencyProvider>
    </QueryClientProvider>,
  );

test("a price in dollars is shown in pounds without decimals, and in euros with cents, in each language's style", () => {
  expect(formatMoney(12.5, "USD", 1, "en-US")).toBe("$12.50");
  expect(formatMoney("12.50", "LBP", 89500, "en-US")).toBe("LBP 1,118,750");
  expect(formatMoney(12.5, "EUR", 0.87, "fr-FR")).toBe("10,88 €");
  expect(formatMoney(12.5, "LBP", 89500, "ar-LB-u-nu-latn")).toContain("1.118.750"); // Lebanese Arabic groups thousands with dots
  expect(formatMoney(1500, "USD", 1, "en-US", true)).toBe("$1.5K"); // short, for chart axes
});

test("the currency button changes every price, and the choice is remembered", async () => {
  withProviders(
    <>
      <CurrencySelect />
      <Price product={{ price: "12.50", salePrice: null, promotion: null }} />
    </>,
  );
  expect(screen.getByText("$12.50")).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Currency"), "LBP");
  expect(await screen.findByText("LBP 1,118,750")).toBeInTheDocument();
  expect(localStorage.getItem("currency")).toBe("LBP");

  await userEvent.selectOptions(screen.getByLabelText("Currency"), "€ EUR");
  expect(await screen.findByText("€10.88")).toBeInTheDocument();
});

test("until the rates are loaded, prices stay in dollars", async () => {
  localStorage.setItem("currency", "LBP");
  vi.spyOn(currenciesApi, "list").mockImplementation(() => new Promise((answer) => setTimeout(() => answer(rates), 50)));
  withProviders(<Price product={{ price: "12.50", salePrice: null, promotion: null }} />);
  expect(screen.getByText("$12.50")).toBeInTheDocument();
  expect(await screen.findByText("LBP 1,118,750")).toBeInTheDocument(); // then in pounds, as chosen last time
});

test("the admin changes a rate on the dashboard", async () => {
  const setRate = vi.spyOn(currenciesApi, "setRate").mockResolvedValue({ currency: "LBP", rate: "90000", updatedAt: "2026-11-17T09:00:00Z" });
  withProviders(<RatesCard />);
  const lbp = await screen.findByLabelText("1 US dollar in LBP");
  expect(lbp).toHaveValue(89500);
  expect(screen.getByLabelText("1 US dollar in EUR")).toHaveValue(0.87);

  await userEvent.clear(lbp);
  expect(screen.getByText("Must be above 0")).toBeInTheDocument();
  await userEvent.type(lbp, "90000");
  await userEvent.click(screen.getAllByRole("button", { name: "Save" })[1]); // EUR comes first, then LBP
  expect(setRate).toHaveBeenCalledWith("LBP", 90000);
});
