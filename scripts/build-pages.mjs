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

  if (project.demo?.startsWith("projects/")) {
    const demoSource = path.resolve(rootDirectory, project.demo);
    const demoDestination = path.resolve(outputDirectory, project.demo);
    await mkdir(path.dirname(demoDestination), { recursive: true });
    await cp(demoSource, demoDestination, {
      recursive: true,
      filter: (sourcePath) => {
        const relativeSegments = path.relative(demoSource, sourcePath).split(path.sep);
        const excludedDirectory = relativeSegments.some((segment) => [".git", ".openai", "dist"].includes(segment));
        return !excludedDirectory && !sourcePath.endsWith(".tar.gz") && path.basename(sourcePath) !== ".gitignore";
      }
    });
  }
}

console.log(`Pages 构建完成，共收录 ${projects.length} 个项目。`);
