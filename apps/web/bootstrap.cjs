/**
 * Entrypoint for the production web images. Distroless has no shell, so this
 * does what an entrypoint.sh normally would:
 *
 * 1. Regenerate `public/__ENV.js` with the runtime NEXT_PUBLIC_* env vars.
 * 2. Run migrations when RUN_MIGRATIONS=true.
 * 3. Start the bundled API in the all-in-one image.
 * 4. Start the Next.js standalone server.
 */

const { writeFileSync, existsSync, mkdirSync } = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// 1. Inject runtime NEXT_PUBLIC_* env vars into __ENV.js
// ---------------------------------------------------------------------------

const publicDir = path.join(__dirname, "apps", "web", "public");

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const envVars = {};
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("NEXT_PUBLIC_")) {
    envVars[key] = value;
  }
}

writeFileSync(
  path.join(publicDir, "__ENV.js"),
  `self.__ENV = ${JSON.stringify(envVars)};`,
);

// ---------------------------------------------------------------------------
// 2. Run database migrations when RUN_MIGRATIONS=true
// ---------------------------------------------------------------------------
//
// For deploys without a separate migrate container (Docker Swarm has no
// depends_on). Runs the same drizzle-kit migrate as the migrate image, and
// without NODE_ENV like that image, because drizzle.config.ts turns on SSL in
// production.

if (process.env.RUN_MIGRATIONS === "true") {
  const { spawnSync } = require("child_process");
  const migrateDir = path.join(__dirname, "migrate");
  const { NODE_ENV: _nodeEnv, ...env } = process.env;
  const result = spawnSync(
    process.execPath,
    [
      path.join(migrateDir, "node_modules", "drizzle-kit", "bin.cjs"),
      "migrate",
    ],
    { cwd: migrateDir, env, stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// ---------------------------------------------------------------------------
// 3. Start the bundled API (all-in-one image) unless an external one is set
// ---------------------------------------------------------------------------

let apiReady = Promise.resolve();
const embeddedApi = process.env.KAN_EMBEDDED_API;

if (embeddedApi && !process.env.KAN_API_URL) {
  const { spawn } = require("child_process");
  const port = process.env.API_PORT || "4000";
  const url = `http://127.0.0.1:${port}`;
  const api = spawn(
    process.execPath,
    ["--import", "@swc-node/register/esm-register", "src/main.ts"],
    {
      cwd: embeddedApi,
      env: { ...process.env, API_PORT: port },
      stdio: "inherit",
    },
  );
  // Exit with it so Docker restarts the container instead of serving a dead API.
  api.on("exit", (code) => process.exit(code || 1));
  process.env.KAN_API_URL = url;
  apiReady = (async () => {
    for (let i = 0; i < 120; i++) {
      const ok = await fetch(`${url}/health`).then(
        (r) => r.ok,
        () => false,
      );
      if (ok) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  })();
}

// ---------------------------------------------------------------------------
// 4. Start the Next.js standalone server
// ---------------------------------------------------------------------------

const drainMs = 10_000;
const on = process.on.bind(process);
process.on = (event, listener) =>
  on(
    event,
    event === "SIGTERM" ? () => setTimeout(listener, drainMs, event) : listener,
  );

void apiReady.then(() => require("./apps/web/server.js"));
