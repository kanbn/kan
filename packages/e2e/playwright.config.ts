import { defineConfig, devices } from "@playwright/test";

type Mode = "self-hosted" | "cloud";
const modeConfig: Record<Mode, { port: string; kanEnv: string }> = {
  "self-hosted": { port: process.env.PORT ?? "3000", kanEnv: "" },
  cloud: { port: process.env.CLOUD_PORT ?? "3100", kanEnv: "cloud" },
};

const mode: Mode = (process.env.E2E_MODE as Mode | undefined) ?? "self-hosted";
const { port, kanEnv } = modeConfig[mode];

const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = remoteBaseURL ?? `http://localhost:${port}`;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
          NEXT_PUBLIC_KAN_ENV: kanEnv,
          NEXT_PUBLIC_USE_STANDALONE_OUTPUT: "",
        },
      },
});
