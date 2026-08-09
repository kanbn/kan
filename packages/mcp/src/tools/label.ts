import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kanRequest } from "../client.js";

// Preset colour palette supported by the Kan UI.
// Mirrors packages/shared/src/constants/colours.ts. Keep in sync.
const COLOUR_PRESETS = {
  Teal: "#0d9488",
  Green: "#65a30d",
  Blue: "#0284c7",
  Purple: "#4f46e5",
  Yellow: "#ca8a04",
  Orange: "#ea580c",
  Red: "#dc2626",
  Pink: "#db2777",
} as const;

const colourNames = Object.keys(COLOUR_PRESETS) as [
  keyof typeof COLOUR_PRESETS,
  ...(keyof typeof COLOUR_PRESETS)[],
];
const colourNameSchema = z.enum(colourNames);
const presetDescription = `One of the preset colour names: ${colourNames.join(", ")}`;

function resolveColourCode(
  colour: keyof typeof COLOUR_PRESETS | undefined,
  colourCode: string | undefined,
): string | undefined {
  if (colourCode) return colourCode;
  if (colour) return COLOUR_PRESETS[colour];
  return undefined;
}

export function registerLabelTools(server: McpServer): void {
  server.tool(
    "get_label",
    "Get a label by its public ID",
    { labelPublicId: z.string().describe("The label's public ID") },
    async ({ labelPublicId }) => {
      const data = await kanRequest("GET", `/labels/${labelPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "create_label",
    `Create a label for a board. Pick a colour by preset name (${colourNames.join(", ")}) or pass an explicit 7-char hex via colourCode. Defaults to Teal.`,
    {
      boardPublicId: z.string().describe("The board's public ID"),
      name: z.string().describe("Label name"),
      colour: colourNameSchema.optional().describe(presetDescription),
      colourCode: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe("Explicit 7-char hex colour (e.g. #0d9488). Overrides `colour` if both are set."),
    },
    async ({ boardPublicId, name, colour, colourCode }) => {
      const resolved = resolveColourCode(colour, colourCode) ?? COLOUR_PRESETS.Teal;
      const data = await kanRequest("POST", "/labels", {
        boardPublicId,
        name,
        colourCode: resolved,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "update_label",
    "Update a label's name or colour. Pick a colour by preset name or pass an explicit 7-char hex.",
    {
      labelPublicId: z.string().describe("The label's public ID"),
      name: z.string().optional().describe("New label name"),
      colour: colourNameSchema.optional().describe(presetDescription),
      colourCode: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe("Explicit 7-char hex colour. Overrides `colour` if both are set."),
    },
    async ({ labelPublicId, name, colour, colourCode }) => {
      const resolved = resolveColourCode(colour, colourCode);
      const body: Record<string, unknown> = {};
      if (name !== undefined) body.name = name;
      if (resolved !== undefined) body.colourCode = resolved;
      const data = await kanRequest("PUT", `/labels/${labelPublicId}`, body);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  server.tool(
    "delete_label",
    "Delete a label",
    { labelPublicId: z.string().describe("The label's public ID") },
    async ({ labelPublicId }) => {
      const data = await kanRequest("DELETE", `/labels/${labelPublicId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
