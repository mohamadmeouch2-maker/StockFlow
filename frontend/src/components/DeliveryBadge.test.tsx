import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { addDays } from "../utils/format";
import { DeliveryBadge } from "./DeliveryBadge";

test("shows the delivery and the day it should arrive", () => {
  render(<DeliveryBadge delivery="EXPRESS" deliverBy={addDays(1).toISOString()} onTheWay />);
  expect(screen.getByText("Express")).toBeInTheDocument();
  expect(screen.getByText(/^· by /)).toBeInTheDocument();
});

test("an order still on its way after its due day is marked late", () => {
  render(<DeliveryBadge delivery="STANDARD" deliverBy={addDays(-2).toISOString()} onTheWay />);
  expect(screen.getByText(/late \(due /)).toBeInTheDocument();
});

test("a delivered order is never late", () => {
  render(<DeliveryBadge delivery="STANDARD" deliverBy={addDays(-2).toISOString()} />);
  expect(screen.queryByText(/late/)).not.toBeInTheDocument();
});
