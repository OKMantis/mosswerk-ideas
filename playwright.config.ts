import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:3100",
    // Playwright's bundled Chromium doesn't support macOS 13, so drive the installed Chrome.
    channel: "chrome",
  },
  webServer: [
    { command: "node e2e/fake-anthropic.mjs", port: 4010, reuseExistingServer: !process.env.CI },
    {
      command: "npm run build && npx next start -p 3100",
      port: 3100,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: { ANTHROPIC_BASE_URL: "http://127.0.0.1:4010", ANTHROPIC_API_KEY: "test" },
    },
  ],
});
