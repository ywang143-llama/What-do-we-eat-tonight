import { defineConfig } from "@playwright/test";

/**
 * End-to-end smoke tests for the share-import flow.
 *
 *   npm run test:e2e            # headless, starts the dev server on :3100
 *   npx playwright install chromium   # once per machine / CI runner
 *
 * Playwright is a devDependency only — it never ships in the app bundle.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The demo kitchen is per browser context, so tests stay isolated; the dev
  // server is the only shared resource.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    // 360×640 is the smallest target the design rules require.
    viewport: { width: 360, height: 640 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --hostname 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    // Force the localStorage demo kitchen: tests must never write to a real
    // Supabase project (or burn OpenRouter credits) even when `.env.local`
    // is filled in on the developer's machine.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      OPENROUTER_API_KEY: "",
    },
  },
});
