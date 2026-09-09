#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { configFromEnv, createKanClient } from "./client.js";
import { createKanMcpServer } from "./server.js";

const client = createKanClient(configFromEnv());
const server = createKanMcpServer(client);

const transport = new StdioServerTransport();
await server.connect(transport);
