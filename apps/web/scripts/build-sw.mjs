import path from "node:path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../");

// await esbuild.build({
//   entryPoints: [path.join(root, "src/sw.ts")],
//   outfile: path.join(root, "public/sw.js"),
//   format: "esm",
//   platform: "browser",
//   bundle: true,
//   minify: process.env.NODE_ENV === "production",
//   sourcemap: false,
// });

await esbuild.build({
  entryPoints: [path.join(root, "src/sw.ts")],
  outfile: path.join(root, "public/sw.js"),
  format: "esm",
  bundle: true,
  platform: "browser",
  minify: process.env.NODE_ENV === "production",
  minifyIdentifiers: process.env.NODE_ENV === "production",
  minifySyntax: process.env.NODE_ENV === "production",
  minifyWhitespace: process.env.NODE_ENV === "production",
  sourcemap: false,
  legalComments: "none",
});

console.log("SW build done → public/sw.js");
