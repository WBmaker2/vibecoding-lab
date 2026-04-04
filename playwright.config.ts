import { defineConfig, devices } from "@playwright/test";
import { createPasswordHash } from "./src/lib/auth/password";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:3100"
  },
  webServer: {
    command: "npx next dev --hostname localhost --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD_HASH: createPasswordHash(
        "very-secret-password",
        "playwright-fixed-salt"
      ),
      SESSION_SECRET: "0123456789abcdef0123456789abcdef"
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
