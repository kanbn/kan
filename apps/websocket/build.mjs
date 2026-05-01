import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/index.js",
  external: ["fsevents"],
  // In CJS output, import.meta.url is undefined; polyfill it so packages
  // that do createRequire(import.meta.url) work correctly.
  define: {
    "import.meta.url": "_importMetaUrl",
  },
  banner: {
    js: "const _importMetaUrl = require('url').pathToFileURL(__filename).href;",
  },
});
