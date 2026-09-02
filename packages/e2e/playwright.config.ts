import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: "../../.env" });

const stripeEnv = (key: string, placeholder: string) =>
  process.env[key] || placeholder;

function resolveStripeListenSecret(apiKey: string): string | undefined {
  try {
    return execFileSync(
      "stripe",
      ["listen", "--print-secret", "--api-key", apiKey],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return undefined;
  }
}

const mailpitSmtpPort = process.env.MAILPIT_SMTP_PORT ?? "1025";
const mailpitHttpPort = process.env.MAILPIT_HTTP_PORT ?? "8025";

const sharedEnv = {
  DISABLE_RATE_LIMIT: "true",
  NEXT_PUBLIC_DISABLE_EMAIL: "false",
  SMTP_HOST: "localhost",
  SMTP_PORT: mailpitSmtpPort,
  SMTP_USER: "",
  SMTP_PASSWORD: "",
  SMTP_SECURE: "false",
};

const realStripeSecretKey =
  process.env.E2E_MODE === "cloud" &&
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "sk_test_e2e_placeholder"
    ? process.env.STRIPE_SECRET_KEY
    : undefined;

const stripeListenSecret = realStripeSecretKey
  ? resolveStripeListenSecret(realStripeSecretKey)
  : undefined;

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
        STRIPE_WEBHOOK_SECRET:
          stripeListenSecret ??
          stripeEnv("STRIPE_WEBHOOK_SECRET", "whsec_e2e_placeholder"),
        STRIPE_WEBHOOK_SECRET_LEGACY:
          stripeListenSecret ??
          stripeEnv(
            "STRIPE_WEBHOOK_SECRET_LEGACY",
            "whsec_e2e_legacy_placeholder",
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
    : [
        ...(process.env.CI
          ? []
          : [
              {
                command: `mailpit --smtp 0.0.0.0:${mailpitSmtpPort} --listen 0.0.0.0:${mailpitHttpPort}`,
                url: `http://localhost:${mailpitHttpPort}/api/v1/info`,
                reuseExistingServer: true,
                timeout: 30_000,
              },
            ]),
        {
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
      ],
});
