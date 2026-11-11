import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { promotionsApi } from "../api/promotions";
import type { Product } from "../api/types";
import { AuthContext, type AuthState } from "../auth/authContext";
import { ChristmasSalePopup } from "./ChristmasSalePopup";
import { Price } from "./Price";

const christmas = { id: 1, name: "Christmas Sale", percent: 30, endsAt: "2026-12-31T23:59:00Z", productCount: 11 };
vi.spyOn(promotionsApi, "current").mockResolvedValue(christmas);

function Where() {
  const { pathname, search } = useLocation();
  return <p>Now at {pathname + search}</p>;
}
const renderPopup = (auth: AuthState | null = null) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={["/products"]}>
          <ChristmasSalePopup />
          <Routes>
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );

test("after the welcome screen, a festive window announces the sale and leads to the deals", async () => {
  renderPopup();
  const dialog = await screen.findByRole("dialog", { name: "Christmas Sale" }, { timeout: 4000 });
  expect(dialog).toHaveTextContent("-30%");
  expect(dialog).toHaveTextContent("on 11 selected products");
  await userEvent.click(screen.getByRole("button", { name: /See the deals/ }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("Now at /products?sale=1")).toBeInTheDocument();
});

test("it shows only once per visit", async () => {
  sessionStorage.setItem("sale-popup-seen-1", "1"); // already seen in this visit
  renderPopup();
  await new Promise((r) => setTimeout(r, 3000));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("a sale price shows in red, with the old price crossed out and the discount", () => {
  const product = { price: "10.00", salePrice: "7.00", promotion: christmas } as Product;
  render(<Price product={product} />);
  expect(screen.getByText("$7.00")).toBeInTheDocument();
  expect(screen.getByText("-30%")).toBeInTheDocument();
  expect(screen.getByRole("deletion")).toHaveTextContent("was $10.00");
});
