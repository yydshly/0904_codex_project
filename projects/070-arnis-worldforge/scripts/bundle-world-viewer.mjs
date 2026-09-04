import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");

await build({
  entryPoints: [path.join(projectDirectory, "demo", "world-viewer.js")],
  outfile: path.join(projectDirectory, "demo", "world-viewer.bundle.js"),
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["chrome100", "edge100", "firefox100", "safari15.4"],
  legalComments: "eof",
});

console.log("Three.js 世界查看器已打包为经典浏览器脚本");
