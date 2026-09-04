import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(rootDirectory, ".pages-dist");
const catalogPath = path.join(rootDirectory, "catalog", "projects.json");
const projects = JSON.parse(await readFile(catalogPath, "utf8"));

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(rootDirectory, "docs"), outputDirectory, { recursive: true });

for (const project of projects) {
  const source = path.resolve(rootDirectory, project.cover);
  const destination = path.resolve(outputDirectory, project.cover);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

console.log(`Pages 构建完成，共收录 ${projects.length} 个项目。`);
