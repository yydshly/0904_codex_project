import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectDirectory, "source", "arnis");
const runtimeId = `sample-suite-${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
const runtimeDirectory = path.join(projectDirectory, ".runtime", runtimeId);
const assetDirectory = path.join(projectDirectory, "demo", "assets", "samples");
const binary = path.join(sourceDirectory, "target", "debug", process.platform === "win32" ? "arnis.exe" : "arnis");

const sourceCommit = "3384d3e042e105247df737968f02c481c142d866";
const sourceVersion = "3.1.0";
const samples = [
  {
    id: "munich-olympiapark",
    title: "慕尼黑奥林匹克公园",
    place: "Olympiapark, Munich, Germany",
    category: "城市地标",
    bbox: "48.1715,11.5430,48.1765,11.5550",
    mode: "geo-only",
    body: "earth",
    scale: 0.5,
    extraArgs: ["--signage=full"],
    outputFormat: "Minecraft Java Anvil",
    summary: "在平地模式中生成道路、场馆和城市对象，并启用仓库内置的慕尼黑奥运地标 schematic。",
    capability: "OSM + Overture + bundled landmarks",
    dataSources: ["OpenStreetMap / Overpass", "Overture Maps", "Arnis bundled Olympiapark landmarks"],
  },
  {
    id: "yosemite-terrain",
    title: "Yosemite 山谷地形",
    place: "Yosemite Valley, California, USA",
    category: "纯自然地形",
    bbox: "37.7300,-119.6500,37.7500,-119.6200",
    mode: "terrain-only",
    body: "earth",
    scale: 0.2,
    extraArgs: [],
    outputFormat: "Minecraft Java Anvil",
    summary: "跳过 OSM 与 Overture，只把美国区域高精度 DEM、地表覆盖和树冠转换成山谷世界。",
    capability: "terrain-only + regional DEM",
    dataSources: ["USGS 3DEP regional DEM", "ESA WorldCover 2021", "Meta/WRI Global Canopy Height"],
  },
  {
    id: "moon-copernicus",
    title: "月球哥白尼环形山",
    place: "Copernicus crater, Moon",
    category: "月球地形",
    bbox: "7.9000,-21.8000,11.4000,-18.3000",
    mode: "terrain-only",
    body: "moon",
    scale: null,
    extraArgs: [],
    outputFormat: "Minecraft Java Anvil",
    summary: "使用 NASA LOLA PDS 高程，以月球固定比例和 4× 垂直夸张生成环形山。",
    capability: "Moon + NASA LOLA",
    dataSources: ["NASA PDS LOLA lunar DEM"],
  },
  {
    id: "mars-olympus-mons",
    title: "火星奥林帕斯山",
    place: "Olympus Mons summit, Mars",
    category: "火星地形",
    bbox: "17.0000,-135.0000,20.0000,-132.0000",
    mode: "terrain-only",
    body: "mars",
    scale: null,
    extraArgs: [],
    outputFormat: "Minecraft Java Anvil",
    summary: "使用 NASA MOLA PDS 高程，以火星固定比例和火星材质生成火山峰顶区域。",
    capability: "Mars + NASA MOLA",
    dataSources: ["NASA PDS MOLA Mars DEM"],
  },
];

const requestedSampleIds = (process.env.ARNIS_SUITE_ONLY || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const selectedSamples = requestedSampleIds.length
  ? samples.filter((sample) => requestedSampleIds.includes(sample.id))
  : samples;
if (requestedSampleIds.length && selectedSamples.length !== requestedSampleIds.length) {
  throw new Error(`Unknown sample id in ARNIS_SUITE_ONLY=${requestedSampleIds.join(",")}`);
}

await stat(binary);
await mkdir(runtimeDirectory, { recursive: true });
await mkdir(assetDirectory, { recursive: true });

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
};

const metric = (log, pattern) => Number(log.match(pattern)?.[1] || 0);

const runSample = async (sample) => {
  const runDirectory = path.join(runtimeDirectory, sample.id);
  const outputBase = path.join(runDirectory, "worlds");
  await mkdir(outputBase, { recursive: true });

  const args = [
    `--output-dir=${outputBase}`,
    `--bbox=${sample.bbox}`,
    `--mode=${sample.mode}`,
    ...(sample.body !== "earth" ? [`--body=${sample.body}`] : []),
    ...(sample.scale ? [`--scale=${sample.scale}`] : []),
    ...sample.extraArgs,
    "--map-preview",
    "--benchmark",
  ];

  console.log(`\n=== ${sample.title} / ${sample.id} ===`);
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
  const log = lines.join("\n");
  await writeFile(path.join(runDirectory, "generation.log"), `${log}\n`, "utf8");
  if (exitCode !== 0) throw new Error(`${sample.id} failed with exit code ${exitCode}`);

  const files = await walk(outputBase);
  const preview = files.find((file) => path.basename(file) === "arnis_world_map.png");
  if (!preview) throw new Error(`${sample.id} completed without arnis_world_map.png`);
  const worldDirectory = path.dirname(preview);
  const previewInfo = await stat(preview);
  const png = await readFile(preview);
  const publicPreview = path.join(assetDirectory, `${sample.id}.png`);
  await copyFile(preview, publicPreview);
  const relativeFiles = files.map((file) => path.relative(worldDirectory, file).replaceAll("\\", "/"));
  const generationTimeMs = metric(log, /generation_time_ms=(\d+)/) || durationMs;
  const effectiveScale = sample.body === "moon" ? 0.005 : sample.body === "mars" ? 0.002 : sample.scale;

  return {
    ...sample,
    evidenceType: "local-run",
    sourceCommit,
    sourceVersion,
    runtimeId,
    command: `target/debug/${process.platform === "win32" ? "arnis.exe" : "arnis"} --output-dir=".runtime/${runtimeId}/${sample.id}/worlds" --bbox="${sample.bbox}" --mode=${sample.mode}${sample.body !== "earth" ? ` --body=${sample.body}` : ""}${sample.scale ? ` --scale=${sample.scale}` : ""}${sample.extraArgs.length ? ` ${sample.extraArgs.join(" ")}` : ""} --map-preview --benchmark`,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs,
    generationTimeMs,
    effectiveScale,
    preview: `assets/samples/${sample.id}.png`,
    previewBytes: previewInfo.size,
    previewWidth: png.readUInt32BE(16),
    previewHeight: png.readUInt32BE(20),
    fileCount: relativeFiles.length,
    topLevelFiles: relativeFiles.filter((file) => !file.includes("/")).sort(),
    runtimeLog: `.runtime/${runtimeId}/${sample.id}/generation.log`,
    observations: {
      elevationRangeMeters: Number(log.match(/Realistic elevation: ([0-9.]+)m range/)?.[1] || 0),
      osmBuildingsHeightFilled: metric(log, /Filled heights on (\d+) OSM buildings/),
      overtureBuildingsAdded: metric(log, /Added (\d+) buildings from Overture Maps/),
      signageDecals: metric(log, /Signage: (\d+) distinct decals/),
      landmarksPlaced: (log.match(/Olympia(?:stadion|halle|turm|-Schwimmhalle)/g) || []).length,
    },
  };
};

let previousSuite = [];
try {
  previousSuite = JSON.parse(await readFile(path.join(assetDirectory, "sample-suite.json"), "utf8"));
} catch {
  previousSuite = [];
}

const generated = [];
for (const sample of selectedSamples) generated.push(await runSample(sample));
const generatedOrRetained = samples.map((sample) => {
  const current = generated.find((entry) => entry.id === sample.id);
  if (current) return current;
  const retained = previousSuite.find((entry) => entry.id === sample.id && entry.evidenceType === "local-run");
  if (retained) return retained;
  throw new Error(`No generated or retained evidence exists for ${sample.id}`);
});

const primaryManifest = JSON.parse(await readFile(path.join(projectDirectory, "demo", "assets", "actual", "run-manifest.json"), "utf8"));
await copyFile(path.join(projectDirectory, "demo", "assets", "actual", "arnis-world-map.png"), path.join(assetDirectory, "arnis-coast.png"));
await copyFile(path.join(sourceDirectory, "assets", "git", "preview.jpg"), path.join(assetDirectory, "upstream-preview.jpg"));

const suite = [
  {
    id: "arnis-coast",
    title: "Arnis 海岸小城",
    place: primaryManifest.place,
    category: "地理全量生成",
    bbox: primaryManifest.bbox,
    mode: primaryManifest.mode,
    body: "earth",
    scale: primaryManifest.scale,
    effectiveScale: primaryManifest.scale,
    outputFormat: primaryManifest.outputFormat,
    summary: "组合真实高程、建筑、道路、码头、水体、土地覆盖、树冠和标牌生成完整城镇。",
    capability: "geo-terrain + complete city stack",
    dataSources: primaryManifest.dataSources,
    evidenceType: "local-run",
    sourceCommit,
    sourceVersion,
    runtimeId: primaryManifest.proofId,
    command: primaryManifest.command,
    durationMs: primaryManifest.durationMs,
    generationTimeMs: primaryManifest.generationTimeMs,
    preview: "assets/samples/arnis-coast.png",
    previewBytes: primaryManifest.previewBytes,
    previewWidth: primaryManifest.previewWidth,
    previewHeight: primaryManifest.previewHeight,
    fileCount: primaryManifest.fileCount,
    topLevelFiles: primaryManifest.topLevelFiles,
    runtimeLog: primaryManifest.evidence.runtimeLog,
    observations: primaryManifest.observations,
  },
  ...generatedOrRetained,
  {
    id: "upstream-official",
    title: "上游官方游戏内效果",
    place: "Arnis upstream README",
    category: "官方示例",
    bbox: "—",
    mode: "Repository showcase",
    body: "earth",
    scale: null,
    effectiveScale: null,
    outputFormat: "Java / Bedrock / Luanti",
    summary: "原仓库 README 内置的 Minecraft 游戏内截图，用于补足俯视 PNG 无法表达的三维游玩效果。",
    capability: "upstream in-game screenshot",
    dataSources: ["Bundled upstream asset: assets/git/preview.jpg"],
    evidenceType: "upstream-official",
    sourceCommit,
    sourceVersion,
    preview: "assets/samples/upstream-preview.jpg",
    previewWidth: null,
    previewHeight: null,
    fileCount: null,
    durationMs: null,
    generationTimeMs: null,
    command: null,
    observations: {},
  },
];

await writeFile(path.join(assetDirectory, "sample-suite.json"), `${JSON.stringify(suite, null, 2)}\n`, "utf8");
await writeFile(
  path.join(projectDirectory, "demo", "sample-suite.js"),
  `window.ARNIS_SAMPLE_SUITE = Object.freeze(${JSON.stringify(suite, null, 2)});\n`,
  "utf8",
);

console.log(`\nSample suite complete: ${runtimeId}`);
console.log(`Generated ${generated.length} new world(s) and retained ${suite.length} showcase samples.`);
