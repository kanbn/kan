import type { KanClient } from "../client.js";

interface WorkspaceMembership {
  workspace: { publicId: string; name: string };
}

export type WorkspaceLookup =
  | { found: true; workspace: { publicId: string; name: string } }
  | { found: false; message: string };

export async function findWorkspaceByName(
  client: KanClient,
  name: string,
): Promise<WorkspaceLookup> {
  const memberships = await client.request<WorkspaceMembership[]>(
    "GET",
    "/workspaces",
  );
  const match = memberships.find(
    (m) => m.workspace.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    const names = memberships.map((m) => m.workspace.name).join(", ");
    return {
      found: false,
      message: `No workspace found with name "${name}". Available workspaces: ${names}`,
    };
  }
  return { found: true, workspace: match.workspace };
}
