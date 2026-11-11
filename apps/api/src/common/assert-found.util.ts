import { NotFoundException } from "@nestjs/common";

export async function assertFound<T>(
  lookup: Promise<T | undefined | null>,
  message: string,
): Promise<T> {
  const result = await lookup;
  if (!result) throw new NotFoundException(message);
  return result;
}
