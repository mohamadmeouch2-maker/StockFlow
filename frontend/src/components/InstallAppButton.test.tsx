import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import manifestText from "../../public/manifest.webmanifest?raw";
import { InstallAppButton } from "./InstallAppButton";

// What Chrome sends when the website can be installed; the user then says yes or "not now"
function offerInstall(outcome: "accepted" | "dismissed") {
  const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  act(() => {
    window.dispatchEvent(offer);
  });
  return offer;
}
const installButton = () => screen.queryByRole("button", { name: "Install the app" });

test("Install the app shows only when the browser can install StockFlow, and asks the browser", async () => {
  const onDone = vi.fn();
  render(<InstallAppButton onDone={onDone} />);
  expect(installButton()).not.toBeInTheDocument(); // no offer: Firefox, iPhone, or already installed

  const first = offerInstall("dismissed");
  expect(first.defaultPrevented).toBe(true); // no banner from the browser: the button is enough
  await userEvent.click(installButton()!);
  expect(first.prompt).toHaveBeenCalled(); // "Install StockFlow?"
  expect(onDone).toHaveBeenCalled(); // the ☰ menu closes
  expect(installButton()).toBeInTheDocument(); // "Not now": the button stays

  const second = offerInstall("accepted");
  await userEvent.click(installButton()!);
  expect(second.prompt).toHaveBeenCalled();
  await waitFor(() => expect(installButton()).not.toBeInTheDocument()); // installed
});

test("once the app is installed (also from the browser's own button), Install the app goes away", () => {
  render(<InstallAppButton />);
  offerInstall("dismissed");
  expect(installButton()).toBeInTheDocument();
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(installButton()).not.toBeInTheDocument();
});

test("the app description has the name, the icons and its own window", () => {
  const manifest = JSON.parse(manifestText) as { icons: { sizes: string; purpose: string }[] } & Record<string, unknown>;
  expect(manifest).toMatchObject({ name: "StockFlow", short_name: "StockFlow", start_url: "/", display: "standalone" });
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"])); // what Chrome needs to install
  expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true); // phones cut the icon to their own shape
});
