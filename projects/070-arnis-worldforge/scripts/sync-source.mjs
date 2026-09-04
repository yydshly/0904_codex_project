import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectDirectory, "source", "arnis");
const demoDirectory = path.join(projectDirectory, "demo");

const git = async (...args) => {
  const { stdout } = await execFileAsync("git", ["-C", sourceDirectory, ...args]);
  return stdout.trim();
};

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
};

const cargo = await readFile(path.join(sourceDirectory, "Cargo.toml"), "utf8");
const argsSource = await readFile(path.join(sourceDirectory, "src", "args.rs"), "utf8");
const rustFiles = (await walk(path.join(sourceDirectory, "src"))).filter((file) => file.endsWith(".rs"));
const processorFiles = (await readdir(path.join(sourceDirectory, "src", "element_processing")))
  .filter((file) => file.endsWith(".rs") && file !== "mod.rs");
const version = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? "unknown";
const longFlags = [...argsSource.matchAll(/#\[arg\([^\]]*?long(?:\s*=\s*"([^"]+)")?/gs)]
  .map((match) => match[1] ?? "implicit")
  .length;

const snapshot = {
  commit: await git("rev-parse", "HEAD"),
  shortCommit: await git("rev-parse", "--short=8", "HEAD"),
  commitDate: await git("log", "-1", "--format=%cs"),
  commitSubject: await git("log", "-1", "--format=%s"),
  branch: await git("branch", "--show-current"),
  version,
  rustFiles: rustFiles.length,
  processorModules: processorFiles.length,
  cliFlags: longFlags,
  outputs: ["Java Anvil", "Bedrock .mcworld", "Luanti / Mineclonia"],
  source: "https://github.com/louis-e/arnis",
  generatedAt: new Date().toISOString()
};

await writeFile(
  path.join(demoDirectory, "source-snapshot.js"),
  `window.ARNIS_SNAPSHOT = Object.freeze(${JSON.stringify(snapshot, null, 2)});\n`,
  "utf8"
);

console.log(`Arnis 源码快照已同步：v${version} @ ${snapshot.shortCommit}`);
