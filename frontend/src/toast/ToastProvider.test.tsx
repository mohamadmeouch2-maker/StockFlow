import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";

// A tiny page with buttons that show messages.
function Demo() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast("Product saved")}>Save</button>
      <button onClick={() => toast("Could not save", "error")}>Fail</button>
    </>
  );
}
afterEach(() => vi.useRealTimers());

test("a message pops up and goes away by itself after a few seconds", () => {
  vi.useFakeTimers();
  render(
    <ToastProvider>
      <Demo />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getByRole("status")).toHaveTextContent("Product saved");
  act(() => vi.advanceTimersByTime(3500));
  expect(screen.queryByText("Product saved")).not.toBeInTheDocument();
});

test("errors are announced as alerts and can be closed by hand", () => {
  render(
    <ToastProvider>
      <Demo />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Fail" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  fireEvent.click(screen.getByRole("button", { name: "Close message" }));
  expect(screen.queryByText("Could not save")).not.toBeInTheDocument();
});

test("at most three messages are shown at a time", () => {
  render(
    <ToastProvider>
      <Demo />
    </ToastProvider>,
  );
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(screen.getAllByText("Product saved")).toHaveLength(3);
});
