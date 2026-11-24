import type { Page } from "@playwright/test";

export function waitForResponsePath(
  page: Page,
  pathSubstring: string,
  method = "POST",
) {
  return page.waitForResponse(
    (res) =>
      res.url().includes(pathSubstring) && res.request().method() === method,
  );
}

export function waitForApi(page: Page, method: string, pathname: RegExp) {
  return page.waitForResponse(
    (res) =>
      res.request().method() === method &&
      pathname.test(new URL(res.url()).pathname.replace(/^\/api\/v1/, "")),
  );
}
