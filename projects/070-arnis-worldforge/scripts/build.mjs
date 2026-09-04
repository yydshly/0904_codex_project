import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./sync-source.mjs";
import "./bundle-world-viewer.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectDirectory, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(projectDirectory, "demo"), outputDirectory, { recursive: true });
await rm(path.join(outputDirectory, "vendor"), { recursive: true, force: true });

console.log(`静态展示已构建：${outputDirectory}`);
