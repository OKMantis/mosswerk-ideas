import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // Playwright's bundled Chromium doesn't support macOS 13, so drive the installed Chrome.
  use: { channel: "chrome" },
});
