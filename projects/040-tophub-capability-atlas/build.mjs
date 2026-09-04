import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(projectRoot, "demo");
const outputDirectory = path.join(projectRoot, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true });

console.log("TopHub 能力图谱静态站点已构建到 dist。 ");
