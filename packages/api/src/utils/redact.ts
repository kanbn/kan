const REDACTED = "[REDACTED]";
const MAX_DEPTH = 10;

// Keys are compared lowercased with "_" and "-" removed.
const SENSITIVE_KEY_PARTS = [
  "token",
  "secret",
  "password",
  "apikey",
  "licensekey",
];
const SENSITIVE_KEYS = new Set([
  "code",
  "authorization",
  "cookie",
  "setcookie",
  "signature",
  "invitecode",
]);

const isSensitiveKey = (key: string) => {
  const normalized = key.toLowerCase().replace(/[-_]/g, "");
  return (
    SENSITIVE_KEYS.has(normalized) ||
    SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))
  );
};

/**
 * Returns a copy of a value with secret-looking keys masked, for logging
 * request input. The original value is never mutated.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  // Leave Dates and other class instances as they are.
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? REDACTED : redactSensitive(item, depth + 1),
    ]),
  );
}
