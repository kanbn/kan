import { TRPCError } from "@trpc/server";

export async function assertFound<T>(
  lookup: Promise<T | undefined | null>,
  message: string,
): Promise<T> {
  const result = await lookup;
  if (!result) throw new TRPCError({ message, code: "NOT_FOUND" });
  return result;
}
