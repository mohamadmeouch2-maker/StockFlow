import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { setTheme, THEME_KEY } from "../theme/theme";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  setTheme("light");
  localStorage.clear();
});

test("the 🌙 button turns dark mode on and off, and the choice is remembered", async () => {
  render(<ThemeToggle />);
  const button = screen.getByRole("button", { name: "Dark mode" });
  expect(button).toHaveAttribute("aria-pressed", "false");
  expect(document.documentElement.dataset.theme).toBeUndefined();

  await userEvent.click(button);
  expect(button).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement.dataset.theme).toBe("dark"); // index.css shows the dark colours
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");

  await userEvent.click(button);
  expect(button).toHaveAttribute("aria-pressed", "false");
  expect(document.documentElement.dataset.theme).toBeUndefined();
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
});

test("every button shows the same mode (dark mode chosen somewhere else)", () => {
  render(<ThemeToggle />);
  act(() => setTheme("dark"));
  expect(screen.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
});
