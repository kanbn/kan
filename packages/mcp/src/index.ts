#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerWorkspaceTools } from "./tools/workspace.js";
import { registerBoardTools } from "./tools/board.js";
import { registerListTools } from "./tools/list.js";
import { registerCardTools } from "./tools/card.js";
import { registerChecklistTools } from "./tools/checklist.js";
import { registerLabelTools } from "./tools/label.js";
import { registerMemberTools } from "./tools/member.js";

const server = new McpServer({
  name: "kan",
  version: "0.1.0",
});

registerWorkspaceTools(server);
registerBoardTools(server);
registerListTools(server);
registerCardTools(server);
registerChecklistTools(server);
registerLabelTools(server);
registerMemberTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
