/**
 * customFetch (packages/api-client/src/mutator/custom-fetch.ts) throws
 * `Object.assign(new Error(message), { status, data })` on non-2xx
 * responses, where `status` is the response's HTTP status.
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (error instanceof Error && "status" in error) {
    return (error as Error & { status?: number }).status;
  }
  return undefined;
}

/**
 * The validation message for one request field, from the `errors` (zod
 * issues) a 400 "Validation failed" response carries.
 */
export function getApiFieldError(
  error: unknown,
  field: string,
): string | undefined {
  const issues =
    error instanceof Error && "data" in error
      ? (error as Error & { data?: { errors?: unknown } }).data?.errors
      : undefined;
  if (!Array.isArray(issues)) return undefined;
  const issue = (issues as { path?: unknown[]; message?: string }[]).find(
    (item) => item.path?.[0] === field,
  );
  return issue?.message;
}
