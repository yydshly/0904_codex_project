import { access, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const runtimeDirectory = path.join(projectDirectory, ".runtime");
const outputDirectory = path.join(projectDirectory, "demo", "assets", "downloads");
const archiveName = "arnis-munich-olympiapark-java.zip";
const archivePath = path.join(outputDirectory, archiveName);

async function worldExists(candidate) {
  try {
    await access(path.join(candidate, "level.dat"));
    await access(path.join(candidate, "metadata.json"));
    await access(path.join(candidate, "region"));
    return true;
  } catch {
    return false;
  }
}

async function resolveWorldDirectory() {
  if (process.env.ARNIS_WORLD_DIR) {
    const configured = path.resolve(projectDirectory, process.env.ARNIS_WORLD_DIR);
    if (await worldExists(configured)) return configured;
    throw new Error(`ARNIS_WORLD_DIR is not a complete Java world: ${configured}`);
  }

  const entries = await readdir(runtimeDirectory, { withFileTypes: true }).catch(() => []);
  const suites = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("sample-suite-"))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const suite of suites) {
    const candidate = path.join(runtimeDirectory, suite, "munich-olympiapark", "worlds", "Arnis World 1");
    if (await worldExists(candidate)) return candidate;
  }
  throw new Error("No generated Munich Java world found. Run `npm run samples`, or set ARNIS_WORLD_DIR.");
}

async function collectFiles(root, relativeDirectory = "") {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
  }
  return files.sort();
}

async function runTar(sourceDirectory) {
  await rm(archivePath, { force: true });
  await new Promise((resolve, reject) => {
    const child = spawn("tar", [
      "-a", "-cf", archivePath,
      "-C", path.dirname(sourceDirectory),
      path.basename(sourceDirectory),
    ], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`tar exited with ${code}`)));
  });
}

const worldDirectory = await resolveWorldDirectory();
const metadata = JSON.parse(await readFile(path.join(worldDirectory, "metadata.json"), "utf8"));
const files = await collectFiles(worldDirectory);
const fileStats = await Promise.all(files.map((file) => stat(path.join(worldDirectory, file))));
const worldBytes = fileStats.reduce((total, file) => total + file.size, 0);

await mkdir(outputDirectory, { recursive: true });
await runTar(worldDirectory);

const archiveBuffer = await readFile(archivePath);
const archiveSha256 = createHash("sha256").update(archiveBuffer).digest("hex");
const topLevelEntries = [...new Set(files.map((file) => file.split(path.sep)[0]))];
const manifest = {
  schema: "arnis-java-world-package-v1",
  generatedAt: new Date().toISOString(),
  place: "Olympiapark, Munich, Germany",
  worldName: path.basename(worldDirectory),
  bbox: `${metadata.minGeoLat},${metadata.minGeoLon},${metadata.maxGeoLat},${metadata.maxGeoLon}`,
  mode: "geo-only",
  scale: metadata.scale,
  dimensions: {
    width: metadata.maxMcX - metadata.minMcX + 1,
    depth: metadata.maxMcZ - metadata.minMcZ + 1,
  },
  sourceDirectory: path.relative(projectDirectory, worldDirectory).split(path.sep).join("/"),
  fileCount: files.length,
  worldBytes,
  topLevelEntries,
  requiredEntries: {
    levelDat: files.includes("level.dat"),
    region: files.some((file) => file.startsWith(`region${path.sep}`)),
    data: files.some((file) => file.startsWith(`data${path.sep}`)),
    metadata: files.includes("metadata.json"),
    mapPreview: files.includes("arnis_world_map.png"),
  },
  archive: {
    url: `assets/downloads/${archiveName}`,
    fileName: archiveName,
    byteLength: archiveBuffer.byteLength,
    sha256: archiveSha256,
    rootDirectory: path.basename(worldDirectory),
  },
  install: {
    edition: "Minecraft Java Edition",
    windowsSavesPath: "%APPDATA%\\.minecraft\\saves",
    instruction: "解压 ZIP，把 Arnis World 1 文件夹放入 saves，然后在单人游戏中打开。",
  },
};

await writeFile(path.join(outputDirectory, "world-package-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "world-package-manifest.js"), `window.ARNIS_WORLD_PACKAGE = ${JSON.stringify(manifest, null, 2)};\n`);

console.log(`真实 Java 世界已打包：${archivePath}`);
console.log(`${files.length} files · ${worldBytes} source bytes · ${archiveBuffer.byteLength} ZIP bytes`);
console.log(`SHA-256 ${archiveSha256}`);
