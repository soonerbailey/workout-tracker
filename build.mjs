// Build: bundles src/ into app.js (React, Recharts and Firebase included — no CDNs, no
// in-browser Babel) and writes index.html + sw.js with a version stamp.
//   npm install      (once)
//   npm run build    (after any change in src/)
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const result = await build({
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019", "safari14"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  write: false,
  outfile: "app.js",
  logLevel: "warning",
});
const js = result.outputFiles[0].contents;
const version = createHash("sha256").update(js).digest("hex").slice(0, 10);
writeFileSync("app.js", js);
writeFileSync("index.html", readFileSync("src/index.template.html", "utf8").replaceAll("__VERSION__", version));
writeFileSync("sw.js", readFileSync("src/sw.template.js", "utf8").replaceAll("__VERSION__", version));
console.log(`Built app.js (${(js.length / 1024).toFixed(0)} KB), version ${version}`);
