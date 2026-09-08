import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { findWorkspaceByName } from "./shared.js";

describe("findWorkspaceByName", () => {
  it("resolves GET /workspaces' nested membership shape, case-insensitively", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce([
        { workspace: { publicId: "ws-000001", name: "Marketing" } },
        { workspace: { publicId: "ws-000002", name: "Engineering" } },
      ]);
    const client: KanClient = { request };

    const result = await findWorkspaceByName(client, "engineering");

    expect(result).toEqual({
      found: true,
      workspace: { publicId: "ws-000002", name: "Engineering" },
    });
  });

  it("returns a message listing available workspaces when nothing matches", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce([
        { workspace: { publicId: "ws-000001", name: "Marketing" } },
        { workspace: { publicId: "ws-000002", name: "Engineering" } },
      ]);
    const client: KanClient = { request };

    const result = await findWorkspaceByName(client, "Nonexistent");

    expect(result).toEqual({
      found: false,
      message:
        'No workspace found with name "Nonexistent". Available workspaces: Marketing, Engineering',
    });
  });
});
