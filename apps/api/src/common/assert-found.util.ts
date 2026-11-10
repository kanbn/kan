import { TRPCError } from "@trpc/server";

// Collapses the repeated "fetch by public ID, 404 if missing" pattern that
// shows up in every router port (list, board, card, label, ...).
export async function assertFound<T>(
  lookup: Promise<T | undefined | null>,
  message: string,
): Promise<T> {
  const result = await lookup;
  if (!result) throw new TRPCError({ message, code: "NOT_FOUND" });
  return result;
}
