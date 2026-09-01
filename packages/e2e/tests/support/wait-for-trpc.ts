import type { Page } from "@playwright/test";

export function waitForResponsePath(page: Page, pathSubstring: string) {
  return page.waitForResponse(
    (res) =>
      res.url().includes(pathSubstring) && res.request().method() === "POST",
  );
}

export function waitForTrpcMutation(page: Page, procedure: string) {
  return waitForResponsePath(page, `/api/trpc/${procedure}`);
}
