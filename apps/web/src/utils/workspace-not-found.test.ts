import type { GetServerSidePropsContext } from "next";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notFoundForUnknownWorkspace } from "./workspace-not-found";

vi.mock("~/env", () => ({ env: { KAN_API_URL: "http://api:4000" } }));
vi.mock("@kan/shared/env", () => ({ env: vi.fn() }));

const run = (workspaceSlug: string) =>
  notFoundForUnknownWorkspace({
    params: { workspaceSlug },
  } as unknown as GetServerSidePropsContext);

const mockFetch = (response: Partial<Response> | Error) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response as Response),
    );

afterEach(() => vi.restoreAllMocks());

describe("notFoundForUnknownWorkspace", () => {
  it("returns a 404 when the workspace slug does not exist", async () => {
    const fetchSpy = mockFetch({
      ok: true,
      json: () => Promise.resolve({ exists: false }),
    });

    expect(await run("asdf")).toEqual({ notFound: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api:4000/workspaces/asdf/exists",
    );
  });

  it("renders the page when the workspace exists", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ exists: true }) });

    expect(await run("kan")).toEqual({ props: {} });
  });

  it("renders the page when the API is unreachable", async () => {
    mockFetch(new Error("ECONNREFUSED"));

    expect(await run("kan")).toEqual({ props: {} });
  });
});
