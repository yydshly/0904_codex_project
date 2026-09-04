import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectDirectory, "source", "arnis");
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const proofId = process.env.ARNIS_PROOF_ID || `proof-${timestamp}`;
const runDirectory = path.join(projectDirectory, ".runtime", proofId);
const outputBase = path.join(runDirectory, "worlds");
const binary = path.join(sourceDirectory, "target", "debug", "arnis.exe");
const bbox = "54.6291,9.9295,54.6322,9.9362";
const scale = process.env.ARNIS_PROOF_SCALE || "1";
const args = [
  `--output-dir=${outputBase}`,
  `--bbox=${bbox}`,
  "--mode=geo-terrain",
  `--scale=${scale}`,
  "--map-preview",
  "--benchmark",
];

try {
  await stat(runDirectory);
  throw new Error(`Proof directory already exists: ${runDirectory}. Set a new ARNIS_PROOF_ID.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

await mkdir(outputBase, { recursive: true });

const startedAt = new Date();
const lines = [];
const child = spawn(binary, args, { cwd: sourceDirectory, windowsHide: true });

const collect = (stream, label) => {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    process[label === "stderr" ? "stderr" : "stdout"].write(chunk);
    lines.push(...chunk.replace(/\r/g, "").split("\n").filter(Boolean).map((line) => `[${label}] ${line}`));
  });
};

collect(child.stdout, "stdout");
collect(child.stderr, "stderr");

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", resolve);
});
const completedAt = new Date();
const durationMs = completedAt.getTime() - startedAt.getTime();
await writeFile(path.join(runDirectory, "generation.log"), `${lines.join("\n")}\n`, "utf8");

if (exitCode !== 0) {
  throw new Error(`Arnis generation failed with exit code ${exitCode}. Log: ${path.join(runDirectory, "generation.log")}`);
}

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
};

const files = await walk(outputBase);
const preview = files.find((file) => path.basename(file) === "arnis_world_map.png");
if (!preview) throw new Error("Arnis completed but did not produce arnis_world_map.png");

const worldDirectory = path.dirname(preview);
const previewInfo = await stat(preview);
const assetDirectory = path.join(projectDirectory, "demo", "assets", "actual");
await mkdir(assetDirectory, { recursive: true });
const publicPreview = path.join(assetDirectory, "arnis-world-map.png");
await copyFile(preview, publicPreview);
const png = await readFile(preview);
const previewWidth = png.readUInt32BE(16);
const previewHeight = png.readUInt32BE(20);

const benchmarkLine = [...lines].reverse().find((line) => line.includes("generation_time_ms="));
const generationTimeMs = Number(benchmarkLine?.match(/generation_time_ms=(\d+)/)?.[1] || durationMs);
const joinedLog = lines.join("\n");
const metric = (pattern) => Number(joinedLog.match(pattern)?.[1] || 0);
const relativeFiles = files.map((file) => path.relative(worldDirectory, file).replaceAll("\\", "/"));
const manifest = {
  proofId,
  sourceCommit: "3384d3e042e105247df737968f02c481c142d866",
  sourceVersion: "3.1.0",
  place: "Arnis, Schleswig-Holstein, Germany",
  bbox,
  mode: "geo-terrain",
  scale: Number(scale),
  outputFormat: "Minecraft Java Anvil",
  command: `target/debug/arnis.exe --output-dir=\".runtime/${proofId}/worlds\" --bbox=\"${bbox}\" --mode=geo-terrain --scale=${scale} --map-preview --benchmark`,
  startedAt: startedAt.toISOString(),
  completedAt: completedAt.toISOString(),
  durationMs,
  generationTimeMs,
  previewBytes: previewInfo.size,
  previewWidth,
  previewHeight,
  worldDirectory: path.relative(projectDirectory, worldDirectory).replaceAll("\\", "/"),
  fileCount: relativeFiles.length,
  topLevelFiles: relativeFiles.filter((file) => !file.includes("/")).sort(),
  evidence: {
    preview: "assets/actual/arnis-world-map.png",
    runtimeLog: `.runtime/${proofId}/generation.log`,
  },
  observations: {
    osmBuildingsHeightFilled: metric(/Filled heights on (\d+) OSM buildings/),
    overtureBuildingsAdded: metric(/Added (\d+) buildings from Overture Maps/),
    signageDecals: metric(/Signage: (\d+) distinct decals/),
    signageTiles: metric(/Wrote (\d+) signage map tiles/),
    treeSchematics: metric(/realm eur - (\d+) regional trees/),
    elevationRangeMeters: Number(joinedLog.match(/Realistic elevation: ([0-9.]+)m range/)?.[1] || 0),
  },
  dataSources: [
    "OpenStreetMap / Overpass",
    "Overture Maps",
    "Mapterhorn DEM",
    "ESA WorldCover 2021",
    "Meta/WRI Global Canopy Height",
    "Arnis regional tree schematics",
  ],
};

await writeFile(path.join(assetDirectory, "run-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(
  path.join(projectDirectory, "demo", "actual-run.js"),
  `window.ARNIS_ACTUAL_RUN = Object.freeze(${JSON.stringify(manifest, null, 2)});\n`,
  "utf8",
);

console.log(`\nProof complete: ${publicPreview}`);
console.log(`World: ${worldDirectory}`);
console.log(`Files: ${relativeFiles.length}; duration: ${(durationMs / 1000).toFixed(1)}s`);
