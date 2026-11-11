import type { ToolOptions } from "@rekog/mcp-nest";
import { Tool as RekogTool } from "@rekog/mcp-nest";
import { z } from "zod";

import { PARAM_DESCRIPTIONS } from "./param-descriptions.js";

type Options = ToolOptions & { params?: Record<string, string> };

export function describeParams(
  schema: z.ZodType,
  overrides: Record<string, string> = {},
) {
  if (!(schema instanceof z.ZodObject)) return schema;
  const shape = Object.fromEntries(
    Object.entries(schema.shape as Record<string, z.ZodType>).map(
      ([key, field]) => {
        const description =
          overrides[key] ?? field.description ?? PARAM_DESCRIPTIONS[key];
        return [key, description ? field.describe(description) : field];
      },
    ),
  );
  return schema.extend(shape);
}

export const Tool = ({
  params,
  parameters = z.object({}),
  ...options
}: Options) =>
  RekogTool({ ...options, parameters: describeParams(parameters, params) });
