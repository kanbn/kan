import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { KanClient } from "./client.js";
import { registerBoardTools } from "./tools/board.js";
import { registerCardTools } from "./tools/card.js";
import { registerChecklistTools } from "./tools/checklist.js";
import { registerLabelTools } from "./tools/label.js";
import { registerListTools } from "./tools/list.js";
import { registerMemberTools } from "./tools/member.js";
import { registerWorkspaceTools } from "./tools/workspace.js";

export function createKanMcpServer(client: KanClient): McpServer {
  const server = new McpServer({
    name: "kan",
    version: "0.1.0",
  });

  registerWorkspaceTools(server, client);
  registerBoardTools(server, client);
  registerListTools(server, client);
  registerCardTools(server, client);
  registerChecklistTools(server, client);
  registerLabelTools(server, client);
  registerMemberTools(server, client);

  return server;
}
