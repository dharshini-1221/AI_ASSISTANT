import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || "https://ai-assistant-main-six.vercel.app",
    headless: true,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
