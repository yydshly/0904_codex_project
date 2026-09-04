import { access, readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import nbt from "prismarine-nbt";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const runtimeDirectory = path.join(projectDirectory, ".runtime");

async function worldExists(candidate) {
  try {
    await access(path.join(candidate, "metadata.json"));
    await access(path.join(candidate, "region"));
    return true;
  } catch {
    return false;
  }
}

async function resolveRuntimeRoot() {
  if (process.env.ARNIS_WORLD_DIR) {
    const configured = path.resolve(projectDirectory, process.env.ARNIS_WORLD_DIR);
    if (await worldExists(configured)) return configured;
    throw new Error(`ARNIS_WORLD_DIR does not contain metadata.json + region/: ${configured}`);
  }

  const runtimeEntries = await readdir(runtimeDirectory, { withFileTypes: true }).catch(() => []);
  const suites = runtimeEntries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("sample-suite-"))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  for (const suite of suites) {
    const candidate = path.join(runtimeDirectory, suite, "munich-olympiapark", "worlds", "Arnis World 1");
    if (await worldExists(candidate)) return candidate;
  }
  throw new Error("No generated Munich world found. Run `npm run samples`, or set ARNIS_WORLD_DIR.");
}

const runtimeRoot = await resolveRuntimeRoot();
const outputDirectory = path.join(projectDirectory, "demo", "assets", "worlds", "munich-olympiapark");
const metadata = JSON.parse(await readFile(path.join(runtimeRoot, "metadata.json"), "utf8"));

const dimensions = {
  width: metadata.maxMcX - metadata.minMcX + 1,
  depth: metadata.maxMcZ - metadata.minMcZ + 1,
  minY: -64,
  maxY: 319,
};
dimensions.height = dimensions.maxY - dimensions.minY + 1;

const materialDefinitions = [
  { id: "air", label: "空气", color: "#000000", transparent: true, opacity: 0 },
  { id: "water", label: "水体", color: "#3b91b8", transparent: true, opacity: 0.68 },
  { id: "grass", label: "草地", color: "#6f9349" },
  { id: "dirt", label: "土壤", color: "#725139" },
  { id: "stone", label: "石材", color: "#858986" },
  { id: "sand", label: "沙地", color: "#c7b982" },
  { id: "road", label: "道路", color: "#3d4547" },
  { id: "concrete", label: "混凝土", color: "#b5b8ad" },
  { id: "white", label: "浅色构件", color: "#dedfd4" },
  { id: "brick", label: "砖石", color: "#9a5944" },
  { id: "wood", label: "木材", color: "#8a653e" },
  { id: "foliage", label: "植被", color: "#3f713b", transparent: true, opacity: 0.88 },
  { id: "glass", label: "玻璃", color: "#8fc8cf", transparent: true, opacity: 0.42 },
  { id: "metal", label: "金属", color: "#767f83", metalness: 0.35 },
  { id: "blue", label: "蓝色构件", color: "#527ca4" },
  { id: "red", label: "红色构件", color: "#a64f42" },
  { id: "yellow", label: "黄色构件", color: "#c5a24c" },
  { id: "cyan", label: "青色构件", color: "#5b9a9a" },
  { id: "purple", label: "紫色构件", color: "#78618e" },
  { id: "black", label: "深色构件", color: "#282d2d" },
  { id: "snow", label: "雪/冰", color: "#e9eee7" },
  { id: "orange", label: "橙色构件", color: "#b86e36" },
  { id: "gravel", label: "砂砾", color: "#77736d" },
  { id: "bedrock", label: "基岩", color: "#393b39" },
  { id: "other", label: "其他方块", color: "#8b7d70" },
];

const materialIndex = new Map(materialDefinitions.map((material, index) => [material.id, index]));
const emptyBlocks = new Set(["air", "cave_air", "void_air", "structure_void"]);

function blockMaterial(blockName) {
  const name = blockName.replace("minecraft:", "");
  if (emptyBlocks.has(name)) return materialIndex.get("air");
  if (name.includes("water") || name.includes("kelp") || name.includes("seagrass")) return materialIndex.get("water");
  if (name.includes("grass") || name.includes("moss")) return materialIndex.get("grass");
  if (name.includes("dirt") || name.includes("mud") || name.includes("podzol") || name.includes("farmland")) return materialIndex.get("dirt");
  if (name.includes("sand") && !name.includes("stone")) return materialIndex.get("sand");
  if (name.includes("leaves") || name.includes("sapling") || name.includes("vine") || name.includes("flower") || name.includes("fern") || name.includes("bush")) return materialIndex.get("foliage");
  if (name.includes("log") || name.includes("wood") || name.includes("planks") || name.includes("stem") || name.includes("hyphae") || name.includes("bamboo")) return materialIndex.get("wood");
  if (name.includes("glass") || name.includes("pane")) return materialIndex.get("glass");
  if (name.includes("snow") || name.includes("ice") || name.includes("quartz")) return materialIndex.get("snow");
  if (name.includes("brick") || name.includes("terracotta") && name.includes("red")) return materialIndex.get("brick");
  if (name.includes("gravel") || name.includes("cobblestone")) return materialIndex.get("gravel");
  if (name.includes("bedrock")) return materialIndex.get("bedrock");
  if (name.includes("stone") || name.includes("andesite") || name.includes("diorite") || name.includes("granite") || name.includes("deepslate") || name.includes("tuff")) return materialIndex.get("stone");
  if (name.includes("rail") || name.includes("iron") || name.includes("chain") || name.includes("anvil")) return materialIndex.get("metal");
  if (name.includes("black") || name.includes("gray") || name.includes("coal") || name.includes("basalt")) return materialIndex.get("black");
  if (name.includes("light_gray") || name.includes("concrete") || name.includes("calcite")) return materialIndex.get("concrete");
  if (name.includes("white") || name.includes("bone")) return materialIndex.get("white");
  if (name.includes("blue") || name.includes("lapis")) return materialIndex.get("blue");
  if (name.includes("cyan") || name.includes("prismarine")) return materialIndex.get("cyan");
  if (name.includes("purple") || name.includes("magenta")) return materialIndex.get("purple");
  if (name.includes("red") || name.includes("nether_wart")) return materialIndex.get("red");
  if (name.includes("yellow") || name.includes("gold")) return materialIndex.get("yellow");
  if (name.includes("orange") || name.includes("copper")) return materialIndex.get("orange");
  if (name.includes("path") || name.includes("asphalt")) return materialIndex.get("road");
  return materialIndex.get("other");
}

function inflateChunk(regionBuffer, location) {
  const sectorOffset = location >>> 8;
  const byteOffset = sectorOffset * 4096;
  const length = regionBuffer.readUInt32BE(byteOffset);
  const compression = regionBuffer[byteOffset + 4];
  const compressed = regionBuffer.subarray(byteOffset + 5, byteOffset + 4 + length);
  if (compression === 1) return zlib.gunzipSync(compressed);
  if (compression === 2) return zlib.inflateSync(compressed);
  if (compression === 3) return compressed;
  throw new Error(`Unsupported Anvil compression type: ${compression}`);
}

function paletteValue(data, index, paletteLength) {
  if (paletteLength <= 1 || !data?.length) return 0;
  const bits = Math.max(4, Math.ceil(Math.log2(paletteLength)));
  const valuesPerLong = Math.floor(64 / bits);
  const packed = BigInt.asUintN(64, BigInt(data[Math.floor(index / valuesPerLong)]));
  const shift = BigInt((index % valuesPerLong) * bits);
  return Number((packed >> shift) & ((1n << BigInt(bits)) - 1n));
}

const cells = new Uint16Array(dimensions.width * dimensions.depth * dimensions.height);
const exactBlockCounts = new Map();
const categoryCounts = new Uint32Array(materialDefinitions.length);
const occupiedCountsByY = new Uint32Array(dimensions.height);
const nonBedrockCountsByY = new Uint32Array(dimensions.height);
const bottomCategoryCounts = new Uint32Array(materialDefinitions.length);
let chunksRead = 0;
let sectionsRead = 0;

function cellOffset(x, y, z) {
  return (y - dimensions.minY) * dimensions.width * dimensions.depth + z * dimensions.width + x;
}

const regionDirectory = path.join(runtimeRoot, "region");
const regionNames = (await readdir(regionDirectory)).filter((name) => /^r\.-?\d+\.-?\d+\.mca$/.test(name));

for (const regionName of regionNames) {
  const [, regionXText, regionZText] = /^r\.(-?\d+)\.(-?\d+)\.mca$/.exec(regionName);
  const regionX = Number(regionXText);
  const regionZ = Number(regionZText);
  const regionBuffer = await readFile(path.join(regionDirectory, regionName));

  for (let localIndex = 0; localIndex < 1024; localIndex += 1) {
    const location = regionBuffer.readUInt32BE(localIndex * 4);
    if (location === 0) continue;
    const expectedChunkX = regionX * 32 + (localIndex % 32);
    const expectedChunkZ = regionZ * 32 + Math.floor(localIndex / 32);
    if (expectedChunkX * 16 > metadata.maxMcX || expectedChunkZ * 16 > metadata.maxMcZ) continue;
    if ((expectedChunkX + 1) * 16 <= metadata.minMcX || (expectedChunkZ + 1) * 16 <= metadata.minMcZ) continue;

    const chunkNbt = nbt.simplify((await nbt.parse(inflateChunk(regionBuffer, location), "big")).parsed);
    const chunkX = chunkNbt.xPos ?? expectedChunkX;
    const chunkZ = chunkNbt.zPos ?? expectedChunkZ;
    chunksRead += 1;

    for (const section of chunkNbt.sections ?? chunkNbt.Level?.Sections ?? []) {
      const blockStates = section.block_states ?? section.BlockStates;
      const palette = blockStates?.palette ?? section.Palette;
      const packedData = blockStates?.data ?? section.BlockStates;
      if (!palette?.length) continue;
      sectionsRead += 1;

      const paletteMaterials = palette.map((entry) => blockMaterial(entry.Name ?? entry.name ?? entry));
      for (let localY = 0; localY < 16; localY += 1) {
        const y = Number(section.Y) * 16 + localY;
        if (y < dimensions.minY || y > dimensions.maxY) continue;
        for (let localZ = 0; localZ < 16; localZ += 1) {
          const z = chunkZ * 16 + localZ - metadata.minMcZ;
          if (z < 0 || z >= dimensions.depth) continue;
          for (let localX = 0; localX < 16; localX += 1) {
            const x = chunkX * 16 + localX - metadata.minMcX;
            if (x < 0 || x >= dimensions.width) continue;
            const blockIndex = localY * 256 + localZ * 16 + localX;
            const paletteIndex = paletteValue(packedData, blockIndex, palette.length);
            const block = palette[paletteIndex] ?? palette[0];
            const blockName = block.Name ?? block.name ?? block;
            const category = paletteMaterials[paletteIndex] ?? paletteMaterials[0];
            if (category === 0) continue;
            cells[cellOffset(x, y, z)] = category;
            categoryCounts[category] += 1;
            occupiedCountsByY[y - dimensions.minY] += 1;
            if (category !== materialIndex.get("bedrock")) nonBedrockCountsByY[y - dimensions.minY] += 1;
            if (y === dimensions.minY) bottomCategoryCounts[category] += 1;
            exactBlockCounts.set(blockName, (exactBlockCounts.get(blockName) ?? 0) + 1);
          }
        }
      }
    }
  }
}

const columnTops = [];
let maxOccupiedY = dimensions.minY;
const bedrockMaterial = materialIndex.get("bedrock");
for (let z = 0; z < dimensions.depth; z += 1) {
  for (let x = 0; x < dimensions.width; x += 1) {
    let top = null;
    for (let y = dimensions.maxY; y >= dimensions.minY; y -= 1) {
      const material = cells[cellOffset(x, y, z)];
      if (material !== 0 && material !== bedrockMaterial) {
        top = y;
        break;
      }
    }
    if (top !== null) {
      columnTops.push(top);
      maxOccupiedY = Math.max(maxOccupiedY, top);
    }
  }
}
columnTops.sort((a, b) => a - b);
const percentile = (fraction) => columnTops[Math.floor((columnTops.length - 1) * fraction)];
const surfaceFloorY = percentile(0.5);
const renderMinY = Math.max(dimensions.minY, surfaceFloorY - 5);
const renderMaxY = maxOccupiedY;
const renderHeight = renderMaxY - renderMinY + 1;

const transparentCategories = new Set(
  materialDefinitions.flatMap((material, index) => material.transparent && index !== 0 ? [index] : []),
);

function getCell(x, y, z) {
  if (x < 0 || z < 0 || x >= dimensions.width || z >= dimensions.depth || y < renderMinY || y > renderMaxY) return 0;
  return cells[cellOffset(x, y, z)];
}

function faceVisible(material, neighbor) {
  if (material === 0) return false;
  if (neighbor === 0) return true;
  if (transparentCategories.has(material)) return material !== neighbor;
  return transparentCategories.has(neighbor);
}

const quads = [];
const quadCounts = new Uint32Array(materialDefinitions.length);

function greedy(mask, width, height, emit) {
  for (let v = 0; v < height; v += 1) {
    for (let u = 0; u < width;) {
      const material = mask[v * width + u];
      if (material === 0) {
        u += 1;
        continue;
      }
      let runWidth = 1;
      while (u + runWidth < width && mask[v * width + u + runWidth] === material) runWidth += 1;
      let runHeight = 1;
      heightLoop: while (v + runHeight < height) {
        for (let scan = 0; scan < runWidth; scan += 1) {
          if (mask[(v + runHeight) * width + u + scan] !== material) break heightLoop;
        }
        runHeight += 1;
      }
      for (let clearV = 0; clearV < runHeight; clearV += 1) {
        mask.fill(0, (v + clearV) * width + u, (v + clearV) * width + u + runWidth);
      }
      emit(u, v, runWidth, runHeight, material);
      quadCounts[material] += 1;
      u += runWidth;
    }
  }
}

for (let y = renderMinY; y <= renderMaxY; y += 1) {
  const topMask = new Uint16Array(dimensions.width * dimensions.depth);
  const bottomMask = new Uint16Array(dimensions.width * dimensions.depth);
  for (let z = 0; z < dimensions.depth; z += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const material = getCell(x, y, z);
      const index = z * dimensions.width + x;
      if (faceVisible(material, getCell(x, y + 1, z))) topMask[index] = material;
      if (y > renderMinY && faceVisible(material, getCell(x, y - 1, z))) bottomMask[index] = material;
    }
  }
  greedy(topMask, dimensions.width, dimensions.depth, (x, z, sizeX, sizeZ, material) => {
    quads.push(2, x, y + 1 - renderMinY, z, sizeX, sizeZ, material, 0);
  });
  greedy(bottomMask, dimensions.width, dimensions.depth, (x, z, sizeX, sizeZ, material) => {
    quads.push(3, x, y - renderMinY, z, sizeX, sizeZ, material, 0);
  });
}

for (let x = 0; x < dimensions.width; x += 1) {
  const positiveMask = new Uint16Array(dimensions.depth * renderHeight);
  const negativeMask = new Uint16Array(dimensions.depth * renderHeight);
  for (let localY = 0; localY < renderHeight; localY += 1) {
    const y = renderMinY + localY;
    for (let z = 0; z < dimensions.depth; z += 1) {
      const material = getCell(x, y, z);
      const index = localY * dimensions.depth + z;
      if (faceVisible(material, getCell(x + 1, y, z))) positiveMask[index] = material;
      if (faceVisible(material, getCell(x - 1, y, z))) negativeMask[index] = material;
    }
  }
  greedy(positiveMask, dimensions.depth, renderHeight, (z, localY, sizeZ, sizeY, material) => {
    quads.push(0, x + 1, localY, z, sizeZ, sizeY, material, 0);
  });
  greedy(negativeMask, dimensions.depth, renderHeight, (z, localY, sizeZ, sizeY, material) => {
    quads.push(1, x, localY, z, sizeZ, sizeY, material, 0);
  });
}

for (let z = 0; z < dimensions.depth; z += 1) {
  const positiveMask = new Uint16Array(dimensions.width * renderHeight);
  const negativeMask = new Uint16Array(dimensions.width * renderHeight);
  for (let localY = 0; localY < renderHeight; localY += 1) {
    const y = renderMinY + localY;
    for (let x = 0; x < dimensions.width; x += 1) {
      const material = getCell(x, y, z);
      const index = localY * dimensions.width + x;
      if (faceVisible(material, getCell(x, y, z + 1))) positiveMask[index] = material;
      if (faceVisible(material, getCell(x, y, z - 1))) negativeMask[index] = material;
    }
  }
  greedy(positiveMask, dimensions.width, renderHeight, (x, localY, sizeX, sizeY, material) => {
    quads.push(4, x, localY, z + 1, sizeX, sizeY, material, 0);
  });
  greedy(negativeMask, dimensions.width, renderHeight, (x, localY, sizeX, sizeY, material) => {
    quads.push(5, x, localY, z, sizeX, sizeY, material, 0);
  });
}

const meshBuffer = Buffer.from(new Uint16Array(quads).buffer);
const usedMaterials = materialDefinitions
  .map((material, index) => ({ ...material, index, blockCount: categoryCounts[index], quadCount: quadCounts[index] }))
  .filter((material) => material.blockCount > 0 && material.index !== 0);
const topBlocks = [...exactBlockCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([name, count]) => ({ name, count }));
const sourceRegion = path.relative(projectDirectory, path.join(regionDirectory, "r.0.0.mca")).replaceAll("\\", "/");
const manifest = {
  schema: "arnis-visible-quads-v1",
  generatedAt: new Date().toISOString(),
  evidence: {
    kind: "actual-java-anvil-world",
    geometry: "decoded Minecraft block states; no preview-image extrusion",
    materialTreatment: "simplified auditable palette derived from exact block names",
    undergroundTreatment: `exterior view clipped below Y=${renderMinY}`,
    sourceRegion,
    sourceMetadata: path.relative(projectDirectory, path.join(runtimeRoot, "metadata.json")).replaceAll("\\", "/"),
  },
  place: "Olympiapark, Munich, Germany",
  bbox: `${metadata.minGeoLat},${metadata.minGeoLon},${metadata.maxGeoLat},${metadata.maxGeoLon}`,
  mode: "geo-only",
  scale: metadata.scale,
  dimensions: {
    width: dimensions.width,
    depth: dimensions.depth,
    height: renderHeight,
    sourceMinY: dimensions.minY,
    sourceMaxY: dimensions.maxY,
    renderMinY,
    renderMaxY,
  },
  binary: {
    url: "assets/worlds/munich-olympiapark/visible-quads.bin",
    encoding: "uint16-le",
    stride: 8,
    record: ["face", "x", "y", "z", "u", "v", "material", "reserved"],
    byteLength: meshBuffer.byteLength,
  },
  stats: {
    chunksRead,
    sectionsRead,
    nonAirBlocks: categoryCounts.reduce((sum, count) => sum + count, 0),
    visibleQuads: quads.length / 8,
    materialGroups: usedMaterials.length,
    sourceRegionBytes: (await readFile(path.join(regionDirectory, "r.0.0.mca"))).byteLength,
    occupiedYRange: [
      dimensions.minY + occupiedCountsByY.findIndex((count) => count > 0),
      dimensions.minY + occupiedCountsByY.findLastIndex((count) => count > 0),
    ],
  },
  materials: usedMaterials,
  topBlocks,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "visible-quads.bin"), meshBuffer);
await writeFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "manifest.js"), `window.ARNIS_WORLD_MANIFEST = Object.freeze(${JSON.stringify(manifest, null, 2)});\n`);

console.log(`真实世界 Web 网格已导出：${outputDirectory}`);
console.log(`${chunksRead} chunks · ${sectionsRead} sections · ${manifest.stats.nonAirBlocks.toLocaleString()} blocks · ${manifest.stats.visibleQuads.toLocaleString()} quads · ${(meshBuffer.byteLength / 1024).toFixed(1)} KiB`);
console.log(`Y=${dimensions.minY}: ${[...bottomCategoryCounts].map((count, index) => count ? `${materialDefinitions[index].id}=${count}` : null).filter(Boolean).join(", ")}`);
console.log(`column-top percentiles: p02=${percentile(0.02)}, p25=${percentile(0.25)}, p50=${percentile(0.5)}, p75=${percentile(0.75)}, p98=${percentile(0.98)}`);
