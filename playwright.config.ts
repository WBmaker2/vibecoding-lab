import { defineConfig, devices } from "@playwright/test";
import { createPasswordHash } from "./src/lib/auth/password";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100"
  },
  webServer: {
    command: "npx next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD_HASH: createPasswordHash(
        "very-secret-password",
        "playwright-fixed-salt"
      ),
      SESSION_SECRET: "0123456789abcdef0123456789abcdef",
      POSTGRES_URL: "",
      APP_BASE_URL: "http://127.0.0.1:3100",
      BLOB_READ_WRITE_TOKEN: ""
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
