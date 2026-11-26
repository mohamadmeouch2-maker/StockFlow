import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { stockAlertsApi } from "../api/stockAlerts";
import { BackInStockButton } from "./BackInStockButton";

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BackInStockButton productId={21} />
    </QueryClientProvider>,
  );

test("Tell me when it's back: the customer starts waiting, and can stop", async () => {
  const waitingFor: number[] = [9]; // already waiting for another product
  vi.spyOn(stockAlertsApi, "list").mockImplementation(async () => [...waitingFor]);
  const add = vi.spyOn(stockAlertsApi, "add").mockImplementation(async (id) => void waitingFor.push(id));
  const remove = vi.spyOn(stockAlertsApi, "remove").mockImplementation(async (id) => void waitingFor.splice(waitingFor.indexOf(id), 1));
  renderButton();

  await userEvent.click(await screen.findByRole("button", { name: "Tell me when it's back" }));
  expect(add).toHaveBeenCalledWith(21);
  expect(await screen.findByText("We'll tell you when it's back: a notification and an email.")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Don't tell me" }));
  expect(remove).toHaveBeenCalledWith(21);
  expect(await screen.findByRole("button", { name: "Tell me when it's back" })).toBeInTheDocument();
});
