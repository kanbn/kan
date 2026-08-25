import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: "../../.env" });

const stripeEnv = (key: string, placeholder: string) =>
  process.env[key] || placeholder;

const sharedEnv = { DISABLE_RATE_LIMIT: "true" };

type Mode = "self-hosted" | "cloud";
const modeConfig: Record<Mode, { port: string; env: Record<string, string> }> =
  {
    "self-hosted": {
      port: process.env.PORT ?? "3000",
      env: { NEXT_PUBLIC_KAN_ENV: "" },
    },
    cloud: {
      port: process.env.CLOUD_PORT ?? "3100",
      env: {
        NEXT_PUBLIC_KAN_ENV: "cloud",
        STRIPE_SECRET_KEY: stripeEnv(
          "STRIPE_SECRET_KEY",
          "sk_test_e2e_placeholder",
        ),
        STRIPE_WEBHOOK_SECRET: stripeEnv(
          "STRIPE_WEBHOOK_SECRET",
          "whsec_e2e_placeholder",
        ),
        STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID: stripeEnv(
          "STRIPE_TEAM_PLAN_MONTHLY_PRICE_ID",
          "price_e2e_placeholder",
        ),
        STRIPE_TEAM_PLAN_YEARLY_PRICE_ID: stripeEnv(
          "STRIPE_TEAM_PLAN_YEARLY_PRICE_ID",
          "price_e2e_placeholder",
        ),
        STRIPE_PRO_PLAN_MONTHLY_PRICE_ID: stripeEnv(
          "STRIPE_PRO_PLAN_MONTHLY_PRICE_ID",
          "price_e2e_placeholder",
        ),
        STRIPE_PRO_PLAN_YEARLY_PRICE_ID: stripeEnv(
          "STRIPE_PRO_PLAN_YEARLY_PRICE_ID",
          "price_e2e_placeholder",
        ),
      },
    },
  };

const mode: Mode = (process.env.E2E_MODE as Mode | undefined) ?? "self-hosted";
const { port, env: modeEnv } = modeConfig[mode];

const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = remoteBaseURL ?? `http://localhost:${port}`;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: mode,
      testDir: `./tests/${mode}`,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: remoteBaseURL
    ? undefined
    : {
        command: `pnpm --filter @kan/web build && pnpm --filter @kan/web with-env next start -p ${port}`,
        cwd: "../..",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_BASE_URL: baseURL,
          NEXT_PUBLIC_USE_STANDALONE_OUTPUT: "",
          ...sharedEnv,
          ...modeEnv,
        },
      },
});
