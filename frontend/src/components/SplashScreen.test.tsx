import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { FADE_MS, SHOW_MS, SplashScreen } from "./SplashScreen";

afterEach(() => vi.useRealTimers());

test("shows the logo for 2 seconds, then disappears", () => {
  vi.useFakeTimers(); // control time in the test instead of really waiting
  render(<SplashScreen />);
  const splash = screen.getByRole("status", { name: "StockFlow is starting" });
  expect(splash).toHaveClass("opacity-100");

  act(() => vi.advanceTimersByTime(SHOW_MS - 1));
  expect(splash).toHaveClass("opacity-100"); // still fully visible just before 2 seconds

  act(() => vi.advanceTimersByTime(1));
  expect(splash).toHaveClass("opacity-0"); // fading out

  act(() => vi.advanceTimersByTime(FADE_MS));
  expect(screen.queryByRole("status")).not.toBeInTheDocument(); // gone
});
