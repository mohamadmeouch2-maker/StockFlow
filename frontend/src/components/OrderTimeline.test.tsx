import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Order } from "../api/types";
import { OrderTimeline } from "./OrderTimeline";

const order = (o: Partial<Order>): Order => ({
  id: 7,
  userId: 1,
  status: "PENDING",
  total: "9.00",
  delivery: "STANDARD",
  deliveryFee: "0.00",
  deliverBy: "2026-11-16T10:00:00Z",
  createdAt: "2026-11-11T10:00:00Z",
  items: [],
  ...o,
});

test("a shipped order: placed and shipped are done, delivery is expected", () => {
  render(<OrderTimeline order={order({ status: "SHIPPED", shippedAt: "2026-11-12T09:00:00Z" })} />);
  const steps = screen.getAllByRole("listitem");
  expect(steps[0]).toHaveTextContent("Placed (done)");
  expect(steps[1]).toHaveTextContent("Shipped (done)");
  expect(steps[1]).toHaveTextContent("Nov 12");
  expect(steps[2]).toHaveTextContent("Delivered (not yet)");
  expect(steps[2]).toHaveTextContent("expected by Mon, Nov 16");
});

test("a cancelled order shows only placed and cancelled", () => {
  render(<OrderTimeline order={order({ status: "CANCELLED", cancelledAt: "2026-11-11T12:00:00Z" })} />);
  const steps = screen.getAllByRole("listitem");
  expect(steps).toHaveLength(2);
  expect(steps[1]).toHaveTextContent("Cancelled (done)");
});
