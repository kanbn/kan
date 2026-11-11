/**
 * customFetch (packages/api-client/src/mutator/custom-fetch.ts) throws
 * `Object.assign(new Error(message), { status, data })` on non-2xx
 * responses, where `status` is the HTTP status the TrpcErrorFilter mapped
 * the original tRPC error code to (e.g. CONFLICT -> 409, FORBIDDEN -> 403).
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof Error && "status" in error) {
    return (error as Error & { status?: number }).status;
  }
  return undefined;
}
