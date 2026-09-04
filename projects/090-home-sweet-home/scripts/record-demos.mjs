import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.DEMO_PLAYWRIGHT_PATH || "playwright";
const { chromium } = require(playwrightPath);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectDirectory, "images", "demos");
const temporaryDirectory = path.join(projectDirectory, ".capture-temp");
const baseUrl = (process.argv[2] || "http://127.0.0.1:4190").replace(/\/$/, "");
const executablePath = process.env.DEMO_CHROME_PATH || undefined;
const ffmpegPath = process.env.DEMO_FFMPEG_PATH || "ffmpeg";
const viewport = { width: 1200, height: 675 };
const runFile = promisify(execFile);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

await mkdir(outputDirectory, { recursive: true });
await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath });

async function record(name, pagePath, waitUntilReady, runTimeline) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: temporaryDirectory, size: viewport }
  });
  const page = await context.newPage();
  const recordingStartedAt = Date.now();
  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "networkidle" });
  await waitUntilReady(page);
  const trimStart = (Date.now() - recordingStartedAt) / 1000;
  await runTimeline(page);
  const video = page.video();
  await page.close();
  const recordedPath = await video.path();
  const destination = path.join(outputDirectory, `${name}.webm`);
  await copyFile(recordedPath, destination);
  await context.close();
  process.stdout.write(`${destination}\n`);
  return { path: destination, trimStart };
}

const gardenSource = await record("garden-demo-source", "/", async (page) => {
  await page.waitForSelector("#scene");
  await page.waitForFunction(() => document.querySelector("#loader")?.classList.contains("done"));
  await wait(700);
}, async (page) => {
  await wait(2200);
  for (const label of ["Living Room", "Dining Room", "Bedroom"]) {
    await page.getByRole("button", { name: label }).click();
    await wait(2700);
  }
  await page.locator("#mode").click();
  await wait(1800);
});

const warehouseSource = await record("warehouse-demo-source", "/warehouse.html", async (page) => {
  await page.waitForSelector("#warehouse-canvas");
  await page.waitForFunction(() => document.documentElement.dataset.webglReady === "true");
  await wait(700);
}, async (page) => {
  await wait(1800);
  for (const label of ["02 上架", "03 拣选", "04 出库"]) {
    await page.getByRole("tab", { name: label }).click();
    await wait(2400);
  }
  await wait(1000);
});

await browser.close();
await rm(temporaryDirectory, { recursive: true, force: true });

async function convert(source, name, trimStart) {
  const mp4 = path.join(outputDirectory, `${name}.mp4`);
  const gif = path.join(outputDirectory, `${name}.gif`);
  const cover = path.join(outputDirectory, `${name.replace("-demo", "-cover")}.png`);
  await runFile(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", source, "-ss", String(trimStart),
    "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", mp4
  ]);
  await runFile(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", mp4,
    "-vf", "fps=10,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
    "-loop", "0", gif
  ]);
  await runFile(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y", "-ss", "0.2", "-i", mp4,
    "-frames:v", "1", "-update", "1", cover
  ]);
  process.stdout.write(`${mp4}\n${gif}\n${cover}\n`);
}

await convert(gardenSource.path, "garden-demo", gardenSource.trimStart);
await convert(warehouseSource.path, "warehouse-demo", warehouseSource.trimStart);
