type PublicEnvKey = `NEXT_PUBLIC_${string}`;

/** Reads NEXT_PUBLIC_* vars at runtime: process.env on the server, public/__ENV.js in the browser. */
export function env(key: PublicEnvKey): string | undefined {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    throw new Error(`env() only reads NEXT_PUBLIC_ variables, got "${key}"`);
  }
  if (!("window" in globalThis)) return process.env[key];
  return (globalThis as { __ENV?: Record<string, string | undefined> }).__ENV?.[
    key
  ];
}
