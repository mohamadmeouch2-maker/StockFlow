import "@testing-library/jest-dom/vitest"; // adds matchers like toBeInTheDocument()
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom (the fake browser) can't make preview URLs for chosen files, so pretend it can.
URL.createObjectURL = () => "blob:preview";
URL.revokeObjectURL = () => {};

// Start every test with an empty page and an empty cart.
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
