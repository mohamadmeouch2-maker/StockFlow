import "@testing-library/jest-dom/vitest"; // adds matchers like toBeInTheDocument()
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom (the fake browser) can't make preview URLs for chosen files, so pretend it can.
URL.createObjectURL = () => "blob:preview";
URL.revokeObjectURL = () => {};
// ...and it can't watch an element's size, which the dashboard chart asks for.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Start every test with an empty page and an empty cart.
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
