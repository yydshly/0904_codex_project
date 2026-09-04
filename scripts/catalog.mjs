import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const catalogPath = path.join(rootDirectory, "catalog", "projects.json");
const readmePath = path.join(rootDirectory, "README.md");
const pagesDataPath = path.join(rootDirectory, "docs", "projects.json");
const startMarker = "<!-- PROJECT_INDEX_START -->";
const endMarker = "<!-- PROJECT_INDEX_END -->";
const allowedStatuses = new Set(["queued", "researching", "published", "archived"]);
const statusLabels = {
  queued: "待研究",
  researching: "研究中",
  published: "已发布",
  archived: "已归档"
};

const mode = process.argv.includes("--write") ? "write" : process.argv.includes("--check") ? "check" : null;

if (!mode) {
  console.error("用法：node scripts/catalog.mjs --write|--check");
  process.exit(1);
}

const toPosix = (value) => value.split(path.sep).join("/");
const exists = async (absolutePath) => {
  try {
    await access(absolutePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ").trim();

const rawCatalog = await readFile(catalogPath, "utf8");
let projects;

try {
  projects = JSON.parse(rawCatalog);
} catch (error) {
  console.error(`无法解析 ${toPosix(path.relative(rootDirectory, catalogPath))}: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(projects)) {
  console.error("catalog/projects.json 的根节点必须是数组。");
  process.exit(1);
}

const errors = [];
const orders = new Set();
const slugs = new Set();
const requiredFields = ["order", "slug", "name", "repository", "summary", "status", "cover", "tags"];

for (const [index, project] of projects.entries()) {
  const location = `第 ${index + 1} 条记录`;

  if (!project || typeof project !== "object" || Array.isArray(project)) {
    errors.push(`${location} 必须是对象。`);
    continue;
  }

  for (const field of requiredFields) {
    if (!(field in project)) errors.push(`${location} 缺少字段 ${field}。`);
  }

  if (!Number.isInteger(project.order) || project.order < 1 || project.order > 999) {
    errors.push(`${location} 的 order 必须是 1 到 999 之间的整数。`);
  } else if (orders.has(project.order)) {
    errors.push(`order ${project.order} 重复。`);
  } else {
    orders.add(project.order);
  }

  if (typeof project.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    errors.push(`${location} 的 slug 只能包含小写英文、数字和单个连字符。`);
  } else if (slugs.has(project.slug)) {
    errors.push(`slug ${project.slug} 重复。`);
  } else {
    slugs.add(project.slug);
  }

  for (const field of ["name", "repository", "summary", "status", "cover"]) {
    if (typeof project[field] !== "string" || !project[field].trim()) {
      errors.push(`${location} 的 ${field} 必须是非空字符串。`);
    }
  }

  if (!allowedStatuses.has(project.status)) {
    errors.push(`${location} 的 status 必须是 ${[...allowedStatuses].join("、")} 之一。`);
  }

  if (!Array.isArray(project.tags) || project.tags.some((tag) => typeof tag !== "string" || !tag.trim())) {
    errors.push(`${location} 的 tags 必须是字符串数组。`);
  }

  if (typeof project.demo !== "undefined" && typeof project.demo !== "string") {
    errors.push(`${location} 的 demo 必须是字符串或省略。`);
  }

  if (Number.isInteger(project.order) && typeof project.slug === "string") {
    const directoryName = `${String(project.order).padStart(3, "0")}-${project.slug}`;
    const projectDirectory = path.join(rootDirectory, "projects", directoryName);
    const expectedReadme = path.join(projectDirectory, "README.md");

    if (!(await exists(projectDirectory))) errors.push(`${location} 缺少目录 projects/${directoryName}。`);
    if (!(await exists(expectedReadme))) errors.push(`${location} 缺少 projects/${directoryName}/README.md。`);
  }

  if (typeof project.cover === "string" && project.cover.trim()) {
    const normalizedCover = path.resolve(rootDirectory, project.cover);
    const insideRoot = normalizedCover.startsWith(`${rootDirectory}${path.sep}`);
    if (!insideRoot) errors.push(`${location} 的 cover 必须位于仓库内。`);
    else if (!(await exists(normalizedCover))) errors.push(`${location} 的 cover 文件不存在：${project.cover}。`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

const orderedProjects = [...projects].sort((a, b) => a.order - b.order);
const table = orderedProjects.length
  ? [
      "| 顺序 | 源项目 | 摘要 | 状态 | 研究笔记 | 在线演示 |",
      "| ---: | --- | --- | --- | --- | --- |",
      ...orderedProjects.map((project) => {
        const directoryName = `${String(project.order).padStart(3, "0")}-${project.slug}`;
        const projectLink = `[${escapeCell(project.name)}](${project.repository.trim()})`;
        const researchLink = `[查看笔记](projects/${directoryName}/README.md)`;
        const demoLink = project.demo?.trim() ? `[打开 Demo](${project.demo.trim()})` : "—";
        return `| ${String(project.order).padStart(3, "0")} | ${projectLink} | ${escapeCell(project.summary)} | ${statusLabels[project.status]} | ${researchLink} | ${demoLink} |`;
      })
    ].join("\n")
  : "> 暂无已收录项目。添加第一个项目后运行 `npm run catalog:update`，索引会自动生成。";

const currentReadme = await readFile(readmePath, "utf8");
const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);

if (!markerPattern.test(currentReadme)) {
  console.error("README.md 中缺少项目索引标记。");
  process.exit(1);
}

const nextReadme = currentReadme.replace(markerPattern, `${startMarker}\n\n${table}\n\n${endMarker}`);
const nextPagesData = `${JSON.stringify(orderedProjects, null, 2)}\n`;
const currentPagesData = (await exists(pagesDataPath)) ? await readFile(pagesDataPath, "utf8") : "";

if (mode === "write") {
  await writeFile(readmePath, nextReadme, "utf8");
  await writeFile(pagesDataPath, nextPagesData, "utf8");
  console.log(`已同步 ${orderedProjects.length} 个项目。`);
} else {
  const outOfDate = [];
  if (currentReadme !== nextReadme) outOfDate.push("README.md");
  if (currentPagesData !== nextPagesData) outOfDate.push("docs/projects.json");

  if (outOfDate.length) {
    console.error(`以下文件未同步：${outOfDate.join("、")}。请运行 npm run catalog:update。`);
    process.exit(1);
  }

  console.log(`索引检查通过，共 ${orderedProjects.length} 个项目。`);
}
