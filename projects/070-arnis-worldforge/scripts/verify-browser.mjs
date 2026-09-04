import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const evidenceDirectory = path.join(projectDirectory, ".runtime", "browser-evidence-r7");
const packageManifest = JSON.parse(await readFile(path.join(
  projectDirectory,
  "demo", "assets", "downloads", "world-package-manifest.json",
), "utf8"));
const baseUrl = process.env.ARNIS_DEMO_URL || "http://127.0.0.1:4177";
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

let executablePath;
for (const candidate of chromeCandidates) {
  try {
    await access(candidate);
    executablePath = candidate;
    break;
  } catch { /* try the next installed browser */ }
}
assert.ok(executablePath, "Chrome/Edge executable not found; set CHROME_PATH");
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, colorScheme: "dark", acceptDownloads: true });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

const observations = {};
try {
  const desktopStartedAt = Date.now();
  await page.goto(`${baseUrl}/#world-3d`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#world3d-stage")?.dataset.worldState === "ready", null, { timeout: 30_000 });
  observations.desktop = await page.evaluate(() => ({
    state: document.querySelector("#world3d-stage")?.dataset.worldState,
    width: innerWidth,
    height: innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    blocks: document.querySelector("#world-stat-blocks")?.textContent,
    chunks: document.querySelector("#world-stat-chunks")?.textContent,
    packageFiles: document.querySelector("#world-package-files")?.textContent,
    sourceSize: document.querySelector("#world-package-source-size")?.textContent,
    archiveSize: document.querySelector("#world-package-archive-size")?.textContent,
    sha256: document.querySelector("#world-package-sha")?.textContent,
    href: document.querySelector("#world-package-download")?.getAttribute("href"),
  }));
  observations.desktop.readyMs = Date.now() - desktopStartedAt;
  assert.equal(observations.desktop.state, "ready");
  assert.equal(observations.desktop.overflow, 0);
  assert.equal(observations.desktop.blocks, "605,744");
  assert.equal(observations.desktop.chunks, "504");
  assert.equal(observations.desktop.packageFiles, "221");
  assert.equal(observations.desktop.sourceSize, "4.32 MiB");
  assert.equal(observations.desktop.archiveSize, "1.47 MiB");
  assert.equal(observations.desktop.sha256, packageManifest.archive.sha256);
  assert.equal(observations.desktop.href, packageManifest.archive.url);
  assert.ok(observations.desktop.readyMs < 15_000, `3D first ready exceeded 15s: ${observations.desktop.readyMs}ms`);

  observations.guide = await page.evaluate(() => {
    const section = document.querySelector("#library-guide");
    const principleColumns = getComputedStyle(document.querySelector(".principle-rail")).gridTemplateColumns.split(" ").length;
    const useCaseColumns = getComputedStyle(document.querySelector(".use-case-grid")).gridTemplateColumns.split(" ").length;
    return {
      principleSteps: document.querySelectorAll(".principle-step").length,
      useCases: document.querySelectorAll(".use-case-grid article").length,
      principleColumns,
      useCaseColumns,
      hasNativeBoundary: section?.textContent.includes("不是 Arnis 当前原生输出"),
      hasNotForBoundary: section?.textContent.includes("工程测绘"),
      pipelineHref: document.querySelector('.guide-boundary a[href="#pipeline"]')?.getAttribute("href"),
      labHref: document.querySelector('.guide-boundary a[href="#lab"]')?.getAttribute("href"),
    };
  });
  assert.equal(observations.guide.principleSteps, 3);
  assert.equal(observations.guide.useCases, 4);
  assert.equal(observations.guide.principleColumns, 3);
  assert.equal(observations.guide.useCaseColumns, 4);
  assert.equal(observations.guide.hasNativeBoundary, true);
  assert.equal(observations.guide.hasNotForBoundary, true);
  assert.equal(observations.guide.pipelineHref, "#pipeline");
  assert.equal(observations.guide.labHref, "#lab");

  await page.locator('nav a[href="#library-guide"]').click();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#library-guide").scrollIntoView();
  });
  observations.guide.anchorTop = await page.locator("#library-guide").evaluate((element) => element.getBoundingClientRect().top);
  assert.equal(new URL(page.url()).hash, "#library-guide");
  assert.ok(observations.guide.anchorTop >= 70 && observations.guide.anchorTop <= 110, `Guide anchor was positioned at ${observations.guide.anchorTop}px`);
  await page.screenshot({ path: path.join(evidenceDirectory, "desktop-principle-1280.png") });
  const pipelineLink = page.locator('.guide-boundary a[href="#pipeline"]');
  await pipelineLink.focus();
  await page.keyboard.press("Tab");
  const labLink = page.locator('.guide-boundary a[href="#lab"]');
  observations.guide.keyboardFocus = await labLink.evaluate((element) => ({
    focused: document.activeElement === element,
    outlineStyle: getComputedStyle(element).outlineStyle,
    outlineWidth: getComputedStyle(element).outlineWidth,
  }));
  assert.equal(observations.guide.keyboardFocus.focused, true);
  assert.notEqual(observations.guide.keyboardFocus.outlineStyle, "none");
  await page.locator(".use-case-heading").evaluate((element) => element.scrollIntoView());
  await page.screenshot({ path: path.join(evidenceDirectory, "desktop-scenarios-1280.png") });

  const canvas = page.locator("#world3d-canvas");
  const beforeTop = await canvas.screenshot();
  await page.getByRole("button", { name: "俯视" }).click();
  await page.waitForTimeout(850);
  const afterTop = await canvas.screenshot();
  assert.notDeepEqual(beforeTop, afterTop, "Top-view camera button did not change the rendered canvas");
  await canvas.focus();
  const beforeKey = await canvas.screenshot();
  await canvas.press("ArrowLeft");
  await page.waitForTimeout(120);
  const afterKey = await canvas.screenshot();
  assert.notDeepEqual(beforeKey, afterKey, "Keyboard camera control did not change the rendered canvas");

  await page.locator(".delivery-install summary").click();
  assert.equal(await page.locator(".delivery-install").getAttribute("open"), "");
  assert.match(await page.locator(".delivery-install").innerText(), /\.minecraft\\saves/);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#world-package-download").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), packageManifest.archive.fileName);
  assert.equal(await download.failure(), null);
  const downloadedPath = await download.path();
  assert.ok(downloadedPath, "Browser download did not produce a local file");
  const downloadedBuffer = await readFile(downloadedPath);
  observations.desktop.downloadedBytes = downloadedBuffer.byteLength;
  observations.desktop.downloadedSha256 = createHash("sha256").update(downloadedBuffer).digest("hex");
  assert.equal(observations.desktop.downloadedBytes, packageManifest.archive.byteLength);
  assert.equal(observations.desktop.downloadedSha256, packageManifest.archive.sha256);

  await page.locator(".theme-toggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.locator("#library-guide").isVisible(), true);
  observations.guide.lightTheme = await page.locator("#library-guide").evaluate((element) => ({
    color: getComputedStyle(element).color,
    surface: getComputedStyle(element.querySelector(".principle-step")).backgroundColor,
  }));
  await page.locator(".theme-toggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");

  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(`${baseUrl}/?surface=tablet#world-3d`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#world3d-stage")?.dataset.worldState === "ready", null, { timeout: 30_000 });
  observations.tablet = await page.evaluate(() => {
    const linkRect = document.querySelector("#world-package-download")?.getBoundingClientRect();
    return {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      linkVisible: Boolean(linkRect && linkRect.top >= 0 && linkRect.bottom <= innerHeight),
      steps: document.querySelectorAll(".build-route li").length,
      split: document.querySelectorAll(".implementation-split > div").length,
      principleColumns: getComputedStyle(document.querySelector(".principle-rail")).gridTemplateColumns.split(" ").length,
      useCaseColumns: getComputedStyle(document.querySelector(".use-case-grid")).gridTemplateColumns.split(" ").length,
    };
  });
  assert.equal(observations.tablet.overflow, 0);
  assert.equal(observations.tablet.linkVisible, true);
  assert.equal(observations.tablet.steps, 5);
  assert.equal(observations.tablet.split, 2);
  assert.equal(observations.tablet.principleColumns, 3);
  assert.equal(observations.tablet.useCaseColumns, 2);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#library-guide").scrollIntoView();
  });
  await page.screenshot({ path: path.join(evidenceDirectory, "tablet-principle-820.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/?motion=reduce#world-3d`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#world3d-stage")?.dataset.worldState === "ready", null, { timeout: 30_000 });
  observations.mobile = await page.evaluate(() => {
    const linkRect = document.querySelector("#world-package-download")?.getBoundingClientRect();
    return {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      state: document.querySelector("#world3d-stage")?.dataset.worldState,
      toolbarButtons: document.querySelectorAll(".world3d-toolbar button").length,
      canvasTabIndex: document.querySelector("#world3d-canvas")?.tabIndex,
      automaticMotion: document.querySelector("#world3d-motion")?.getAttribute("aria-pressed"),
      linkVisible: Boolean(linkRect && linkRect.left >= 0 && linkRect.right <= innerWidth && linkRect.top >= 0 && linkRect.bottom <= innerHeight),
      packageFiles: document.querySelector("#world-package-files")?.textContent,
      principleColumns: getComputedStyle(document.querySelector(".principle-rail")).gridTemplateColumns.split(" ").length,
      useCaseColumns: getComputedStyle(document.querySelector(".use-case-grid")).gridTemplateColumns.split(" ").length,
      guideTextVisible: document.querySelector("#library-guide")?.getClientRects().length > 0,
    };
  });
  assert.equal(observations.mobile.overflow, 0);
  assert.equal(observations.mobile.state, "ready");
  assert.equal(observations.mobile.toolbarButtons, 4);
  assert.equal(observations.mobile.canvasTabIndex, 0);
  assert.equal(observations.mobile.automaticMotion, "false");
  assert.equal(observations.mobile.linkVisible, true);
  assert.equal(observations.mobile.packageFiles, "221");
  assert.equal(observations.mobile.principleColumns, 1);
  assert.equal(observations.mobile.useCaseColumns, 1);
  assert.equal(observations.mobile.guideTextVisible, true);
  await page.locator(".delivery-install summary").click();
  assert.equal(await page.locator(".delivery-install").getAttribute("open"), "");
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector("#library-guide").scrollIntoView();
  });
  await page.screenshot({ path: path.join(evidenceDirectory, "mobile-principle-390.png") });
  await page.locator(".use-case-heading").evaluate((element) => element.scrollIntoView());
  await page.screenshot({ path: path.join(evidenceDirectory, "mobile-scenarios-390.png") });

  await page.goto(`${baseUrl}/?world-error=1#world-3d`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#world3d-stage")?.dataset.worldState === "error");
  observations.fallback = await page.evaluate(() => ({
    state: document.querySelector("#world3d-stage")?.dataset.worldState,
    fallbackVisible: getComputedStyle(document.querySelector(".world3d-fallback-image")).opacity === "1",
    controlsDisabled: [...document.querySelectorAll(".world3d-toolbar button")].every((button) => button.disabled),
    downloadVisible: document.querySelector("#world-package-download")?.getClientRects().length > 0,
    downloadHref: document.querySelector("#world-package-download")?.getAttribute("href"),
    title: document.querySelector("#world3d-status b")?.textContent,
    guideVisible: document.querySelector("#library-guide")?.getClientRects().length > 0,
    guideUseCases: document.querySelectorAll(".use-case-grid article").length,
  }));
  assert.equal(observations.fallback.state, "error");
  assert.equal(observations.fallback.fallbackVisible, true);
  assert.equal(observations.fallback.controlsDisabled, true);
  assert.equal(observations.fallback.downloadVisible, true);
  assert.equal(observations.fallback.downloadHref, packageManifest.archive.url);
  assert.equal(observations.fallback.guideVisible, true);
  assert.equal(observations.fallback.guideUseCases, 4);
  await page.screenshot({ path: path.join(evidenceDirectory, "mobile-fallback-download-390.png") });

  const unexpectedErrors = runtimeErrors.filter((message) => !message.includes("已启用三维能力回退测试"));
  assert.deepEqual(unexpectedErrors, []);
  observations.runtimeErrors = unexpectedErrors;
  await writeFile(path.join(evidenceDirectory, "verification.json"), `${JSON.stringify(observations, null, 2)}\n`);
  console.log(JSON.stringify(observations, null, 2));
} finally {
  await browser.close();
}
