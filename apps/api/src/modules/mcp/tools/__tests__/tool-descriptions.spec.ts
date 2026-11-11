import { MCP_TOOL_METADATA_KEY } from "@rekog/mcp-nest";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AttachmentTools } from "../attachment.tools.js";
import { BoardMemberTools } from "../board-member.tools.js";
import { BoardTools } from "../board.tools.js";
import { CardTools } from "../card.tools.js";
import { ChecklistTools } from "../checklist.tools.js";
import { FeedbackTools } from "../feedback.tools.js";
import { LabelTools } from "../label.tools.js";
import { ListTools } from "../list.tools.js";
import { MemberTools } from "../member.tools.js";
import { PermissionTools } from "../permission.tools.js";
import { UserTools } from "../user.tools.js";
import { WebhookTools } from "../webhook.tools.js";
import { WorkspaceTools } from "../workspace.tools.js";

const TOOL_CLASSES = [
  AttachmentTools,
  BoardMemberTools,
  BoardTools,
  CardTools,
  ChecklistTools,
  FeedbackTools,
  LabelTools,
  ListTools,
  MemberTools,
  PermissionTools,
  UserTools,
  WebhookTools,
  WorkspaceTools,
];

interface ToolMetadata {
  name: string;
  parameters: z.ZodType;
}

const tools = TOOL_CLASSES.flatMap((cls) =>
  Object.values(Object.getOwnPropertyDescriptors(cls.prototype))
    .map(
      ({ value }) =>
        Reflect.getMetadata(MCP_TOOL_METADATA_KEY, value as object) as
          | ToolMetadata
          | undefined,
    )
    .filter((tool): tool is ToolMetadata => !!tool),
);

describe("MCP tool parameters", () => {
  it("finds every tool", () => {
    expect(tools.length).toBe(71);
  });

  it.each(tools.map((tool) => [tool.name, tool] as const))(
    "%s describes every parameter",
    (_name, tool) => {
      const schema = z.toJSONSchema(tool.parameters, { io: "input" }) as {
        properties?: Record<string, { description?: string }>;
      };
      const undescribed = Object.entries(schema.properties ?? {})
        .filter(([, property]) => !property.description)
        .map(([key]) => key);
      expect(undescribed).toEqual([]);
    },
  );
});
