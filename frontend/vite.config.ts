/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Component tests (guide 5.3): run in a fake browser (jsdom)
  test: { environment: "jsdom", setupFiles: "./src/setupTests.ts" },
});
