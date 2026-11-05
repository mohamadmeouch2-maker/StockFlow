import "@testing-library/jest-dom/vitest"; // adds matchers like toBeInTheDocument()
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Start every test with an empty page and an empty cart.
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
