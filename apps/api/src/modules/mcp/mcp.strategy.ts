import { McpStrategy, StreamableHttpTransport } from "@rekog/mcp-nest";

export const mcpTransport = new StreamableHttpTransport();

export const mcpStrategy = new McpStrategy({
  name: "kan",
  version: "0.1.0",
  transports: [mcpTransport],
});
