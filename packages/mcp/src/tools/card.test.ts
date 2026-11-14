import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";

import type { KanClient } from "../client.js";
import { registerCardTools } from "./card.js";

async function callCardTool(
  kanClient: KanClient,
  name: string,
  args: Record<string, unknown>,
) {
  const server = new McpServer({ name: "kan-test", version: "0.0.0" });
  registerCardTools(server, kanClient);

  const mcpClient = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    mcpClient.connect(clientTransport),
  ]);

  try {
    return await mcpClient.callTool({ name, arguments: args });
  } finally {
    await Promise.all([mcpClient.close(), server.close()]);
  }
}

describe("create_card", () => {
  it("defaults omitted description to an empty string", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "create_card", {
      listPublicId: "list-123456",
      title: "New card",
    });

    expect(result.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith("POST", "/cards", {
      listPublicId: "list-123456",
      title: "New card",
      description: "",
      dueDate: undefined,
      labelPublicIds: [],
      memberPublicIds: [],
      position: "end",
    });
  });

  it("forwards an explicit description when provided", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "create_card", {
      listPublicId: "list-123456",
      title: "New card",
      description: "Markdown **details**",
    });

    expect(result.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith("POST", "/cards", {
      listPublicId: "list-123456",
      title: "New card",
      description: "Markdown **details**",
      dueDate: undefined,
      labelPublicIds: [],
      memberPublicIds: [],
      position: "end",
    });
  });
});

describe("update_card", () => {
  it("forwards index 0 to PUT /cards/:cardPublicId", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "update_card", {
      cardPublicId: "card-123456",
      listPublicId: "list-654321",
      index: 0,
    });

    expect(result.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith("PUT", "/cards/card-123456", {
      title: undefined,
      description: undefined,
      dueDate: undefined,
      listPublicId: "list-654321",
      index: 0,
    });
  });

  it("forwards non-negative integer index values when reordering", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "update_card", {
      cardPublicId: "card-123456",
      index: 3,
    });

    expect(result.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith("PUT", "/cards/card-123456", {
      title: undefined,
      description: undefined,
      dueDate: undefined,
      listPublicId: undefined,
      index: 3,
    });
  });

  it("preserves existing behavior when index is omitted", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "update_card", {
      cardPublicId: "card-123456",
      title: "Updated title",
      listPublicId: "list-654321",
    });

    expect(result.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith("PUT", "/cards/card-123456", {
      title: "Updated title",
      description: undefined,
      dueDate: undefined,
      listPublicId: "list-654321",
      index: undefined,
    });
  });

  it("rejects negative index values", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "update_card", {
      cardPublicId: "card-123456",
      index: -1,
    });

    expect(result.isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects non-integer index values", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-123456" });
    const client: KanClient = { request };

    const result = await callCardTool(client, "update_card", {
      cardPublicId: "card-123456",
      index: 1.5,
    });

    expect(result.isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
});

describe("duplicate_card", () => {
  it("sends the backend's expected `listPublicId` field when a target list is given", async () => {
    const request = vi.fn().mockResolvedValueOnce({ publicId: "card-999999" });
    const client: KanClient = { request };

    await callCardTool(client, "duplicate_card", {
      cardPublicId: "card-123456",
      targetListPublicId: "list-654321",
    });

    expect(request).toHaveBeenCalledWith(
      "POST",
      "/cards/card-123456/duplicate",
      {
        listPublicId: "list-654321",
        copyLabels: true,
        copyMembers: true,
        copyChecklists: true,
      },
    );
  });

  it("looks up the card's current list when no target list is given", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ list: { publicId: "list-111111" } })
      .mockResolvedValueOnce({ publicId: "card-999999" });
    const client: KanClient = { request };

    await callCardTool(client, "duplicate_card", {
      cardPublicId: "card-123456",
    });

    expect(request).toHaveBeenNthCalledWith(1, "GET", "/cards/card-123456");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/cards/card-123456/duplicate",
      {
        listPublicId: "list-111111",
        copyLabels: true,
        copyMembers: true,
        copyChecklists: true,
      },
    );
  });
});
