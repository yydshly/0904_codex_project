const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const sourceBase = "https://github.com/louis-e/arnis/blob/main/";

const scenes = {
  city: { name: "密集城市", profile: "建筑 + 交通 + 标牌" },
  coast: { name: "海岸港口", profile: "水系 + 港区 + 设施" },
  alpine: { name: "高山聚落", profile: "真实高程 + 稀疏建筑" },
};

const capabilities = {
  terrain: {
    index: "01 / TERRAIN",
    title: "把 DEM 高程变成可行走的方块地形",
    body: "根据区域自动选择高程来源，重投影并采样为地形网格，再做平滑、道路贴合、水系雕刻与边界处理。也支持 Moon / Mars 的 NASA PDS 高程。",
    chips: ["自动高程源选择", "多分辨率 DEM", "道路/桥梁后处理", "月球与火星"],
    href: `${sourceBase}src/elevation/mod.rs`,
    evidence: "查看 elevation 模块",
  },
  city: {
    index: "02 / CITY SEMANTICS",
    title: "把 OSM 标签翻译成城市构件",
    body: "OSM 节点、道路、关系先进入统一元素模型，再由面向建筑、道路、铁路、水体、设施等领域的处理器落位。Overture 可补足缺失建筑和高度。",
    chips: ["建筑与楼层", "道路/铁路/机场", "桥梁与隧道", "Overture 建筑补全"],
    href: `${sourceBase}src/data_processing.rs`,
    evidence: "查看处理器调度",
  },
  environment: {
    index: "03 / ENVIRONMENT",
    title: "用遥感分类与气候，让城市之外也成立",
    body: "ESA WorldCover 决定水体、森林、农田、湿地等地表；Köppen 气候影响生物群系；Meta/WRI 树冠数据给出更可信的树木位置和高度。",
    chips: ["ESA 10m 地表", "Köppen 气候", "Canopy Height", "生物群系写入"],
    href: `${sourceBase}src/landcover.rs`,
    evidence: "查看 landcover 实现",
  },
  detail: {
    index: "04 / WORLD DETAIL",
    title: "在规则生成之上，用模型补足辨识度",
    body: "可从 3DMR、Wikimedia/Wikidata 获取地标模型并体素化，也能放置随仓库分发的车辆、船、起重机、树木等 schematic；标牌则被渲染成可读贴图。",
    chips: ["外部 3D 体素化", "Bundled Schematics", "可读标牌", "材质调色板"],
    href: `${sourceBase}src/models_3d/mod.rs`,
    evidence: "查看 3D 模型管线",
  },
  delivery: {
    index: "05 / DELIVERY",
    title: "一次流程，写出三种可玩的世界格式",
    body: "输出 Minecraft Java Anvil、Minecraft Bedrock .mcworld 或 Luanti map.sqlite。Java 支持照明烘焙、Voxy LOD、地图物品与扩展高度，生成过程按 Region/Chunk 控制内存。",
    chips: ["Java Anvil", "Bedrock .mcworld", "Luanti SQLite", "PNG 地图预览"],
    href: `${sourceBase}src/world_editor/mod.rs`,
    evidence: "查看世界写出抽象",
  },
};

const stages = {
  ingest: {
    index: "01 / FETCH",
    title: "按边界框并行获取多源地理数据",
    body: "CLI 接收 bbox 或本地 OSM 文件。在线模式组合 Overpass、Overture GeoParquet、高程、土地覆盖、树冠和可选 3D 模型，并把下载阶段与生成阶段分开计时。",
    chips: ["LLBBox", "Overpass", "GeoParquet", "Raster tiles"],
    href: `${sourceBase}src/main.rs`,
  },
  normalize: {
    index: "02 / NORMALIZE",
    title: "将来源差异压成统一坐标与元素模型",
    body: "经纬度投影到方块坐标，OSM Node / Way / Relation 被解析成 ProcessedElement；多边形闭合、裁剪、复合关系和数据缺口在进入渲染前被处理。",
    chips: ["坐标投影", "ProcessedElement", "多边形裁剪", "Relation 解析"],
    href: `${sourceBase}src/osm_parser.rs`,
  },
  render: {
    index: "03 / RENDER",
    title: "确定性规则把标签解释成空间语义",
    body: "处理器按类型和优先级运行：地表打底，建筑与交通构件建立体量，再加入设施、植被和标牌。大量启发式规则在标签缺失时保持结果可玩。",
    chips: ["类型分派", "优先级排序", "确定性启发式", "Rayon 并行"],
    href: `${sourceBase}src/element_processing/mod.rs`,
  },
  voxel: {
    index: "04 / VOXELIZE",
    title: "用世界编辑器统一解决方块冲突",
    body: "处理器不直接写文件，而是向 WorldEditor 落方块。编辑器维护空间状态、地面高度、方块属性和区域边界，使道路、隧道、建筑与地形能够互相避让。",
    chips: ["Block state", "XZ / Y 占位", "空间查询", "冲突消解"],
    href: `${sourceBase}src/world_editor/mod.rs`,
  },
  write: {
    index: "05 / WRITE",
    title: "按目标游戏编码 Region、Chunk 与元数据",
    body: "Java、Bedrock、Luanti 各有写入实现，共享上游生成结果。输出阶段负责区块编码、调色板、实体、世界元数据，并可额外生成俯视 PNG 与初始地图物品。",
    chips: ["Anvil NBT", "LevelDB / mcworld", "SQLite", "Map preview"],
    href: `${sourceBase}src/world_editor/`,
  },
};

const locations = {
  arnis: {
    bbox: "54.6270,9.9180,54.6350,9.9410",
    output: "arnis-demo",
    scene: "city",
  },
  harbor: {
    bbox: "53.5380,9.9270,53.5500,9.9580",
    output: "harbor-demo",
    scene: "coast",
  },
  alps: {
    bbox: "46.0120,7.7350,46.0280,7.7650",
    output: "alps-demo",
    scene: "alpine",
  },
};

function detailMarkup(data, kind) {
  return `
    <span class="detail-index">${data.index}</span>
    <h3>${data.title}</h3>
    <p>${data.body}</p>
    <div class="detail-chips">${data.chips.map((chip) => `<span>${chip}</span>`).join("")}</div>
    <a class="detail-evidence" href="${data.href}" target="_blank" rel="noreferrer">
      ${kind === "stage" ? "SOURCE / " : "EVIDENCE / "}${data.evidence || "查看对应源码"} ↗
    </a>`;
}

function activateTab(button, selector, dataKey, render) {
  const group = button.closest('[role="tablist"]');
  $$(selector, group).forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  render(button.dataset[dataKey]);
}

function enableTabKeyboard(group, selector) {
  group.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = $$(selector, group);
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    let next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : index + (event.key === "ArrowRight" ? 1 : -1);
    next = (next + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  });
}

function setScene(sceneKey, updateTabs = true) {
  const scene = scenes[sceneKey];
  $(".world-viewport").dataset.scene = sceneKey;
  $("#scene-name").textContent = scene.name;
  $("#scene-profile").textContent = scene.profile;
  if (updateTabs) {
    $$("[data-preset]").forEach((tab) => {
      const active = tab.dataset.preset === sceneKey;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }
}

function hydrateSnapshot() {
  const snapshot = window.ARNIS_SNAPSHOT;
  if (!snapshot) return;
  $$('[data-snapshot]').forEach((node) => {
    const value = snapshot[node.dataset.snapshot];
    if (value !== undefined && value !== null) node.textContent = value;
  });
}

function currentFormValue(name) {
  return $(`[name="${name}"]:checked`, $("#command-form"))?.value;
}

function highlightCommand(command) {
  const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return command.split(" ").map((token) => {
    if (!token.startsWith("--")) return escape(token);
    const separator = token.indexOf("=");
    if (separator < 0) return `<span class="flag">${escape(token)}</span>`;
    const flag = token.slice(0, separator);
    const value = token.slice(separator + 1);
    return `<span class="flag">${escape(flag)}</span>=<span class="value">${escape(value)}</span>`;
  }).join(" ");
}

function updateCommand() {
  const form = $("#command-form");
  const locationKey = currentFormValue("location");
  const mode = currentFormValue("mode");
  const format = currentFormValue("format");
  const location = locations[locationKey];
  const scale = Number($("#scale-range").value).toFixed(1);
  const skipObjects = mode === "terrain-only";

  ["interior", "overture", "models"].forEach((name) => {
    const input = $(`[name="${name}"]`, form);
    input.disabled = skipObjects;
    input.closest("label").classList.toggle("is-disabled", skipObjects);
  });

  const parts = [
    "cargo run --release --no-default-features --",
    `--output-dir="C:/Minecraft/saves/${location.output}"`,
    `--bbox="${location.bbox}"`,
    `--mode=${mode}`,
    `--scale=${scale}`,
  ];

  if (format === "bedrock") parts.push("--bedrock");
  if (format === "luanti") parts.push("--luanti");
  if (!skipObjects && form.elements.interior.checked) parts.push("--interior");
  if (!skipObjects && !form.elements.overture.checked) parts.push("--overture=false");
  if (!skipObjects && !form.elements.models.checked) parts.push("--no-3d");
  if (form.elements.preview.checked) parts.push("--map-preview");

  const command = parts.join(" ");
  const output = $("#generated-command");
  output.dataset.rawCommand = command;
  output.innerHTML = highlightCommand(command);
  $("#scale-value").value = `${Number(scale).toFixed(2)}×`;

  const expression = {
    "geo-terrain": "完整地理对象 + 真实高程",
    "geo-only": "完整地理对象 + 平坦地面",
    "terrain-only": "仅真实高程，不处理 OSM 对象",
  }[mode];
  const target = {
    java: "Minecraft Java Anvil 世界",
    bedrock: "Minecraft Bedrock .mcworld",
    luanti: "Luanti map.sqlite 世界",
  }[format];
  const network = skipObjects
    ? "DEM · ESA（无 OSM / Overture 对象）"
    : `OSM${form.elements.overture.checked ? " · Overture" : ""} · DEM · ESA · Canopy${form.elements.models.checked ? " · 3D" : ""}`;

  $("#expression-note").textContent = expression;
  $("#output-note").textContent = target;
  $("#network-note").textContent = network;
  $("#command-status").textContent = skipObjects ? "TERRAIN ONLY" : "READY";
  setScene(location.scene);
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function copyCommand() {
  const command = $("#generated-command").dataset.rawCommand;
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = command;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast("命令已复制；请在 source/arnis 中运行");
}

function initTheme() {
  const button = $(".theme-toggle");
  let stored;
  try { stored = localStorage.getItem("arnis-showcase-theme"); } catch { stored = null; }
  const preferred = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  const theme = stored || preferred;
  document.documentElement.dataset.theme = theme;
  button.setAttribute("aria-pressed", String(theme === "light"));
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    button.setAttribute("aria-pressed", String(next === "light"));
    try { localStorage.setItem("arnis-showcase-theme", next); } catch { /* private mode */ }
  });
}

hydrateSnapshot();
initTheme();

const presetGroup = $(".preset-tabs");
$$('[data-preset]', presetGroup).forEach((button, index) => {
  button.tabIndex = index === 0 ? 0 : -1;
  button.addEventListener("click", () => setScene(button.dataset.preset));
});
enableTabKeyboard(presetGroup, "[data-preset]");

$$('[data-layer]').forEach((button) => {
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
    $(`[data-world-layer="${button.dataset.layer}"]`).classList.toggle("is-hidden", !active);
  });
});

const capabilityGroup = $(".capability-tabs");
$$('[data-capability]', capabilityGroup).forEach((button, index) => {
  button.tabIndex = index === 0 ? 0 : -1;
  button.addEventListener("click", () => activateTab(button, "[data-capability]", "capability", (key) => {
    $("#capability-detail").innerHTML = detailMarkup(capabilities[key], "capability");
  }));
});
enableTabKeyboard(capabilityGroup, "[data-capability]");
$("#capability-detail").innerHTML = detailMarkup(capabilities.terrain, "capability");

const pipelineGroup = $(".pipeline-track");
$$('[data-stage]', pipelineGroup).forEach((button, index) => {
  button.tabIndex = index === 0 ? 0 : -1;
  button.addEventListener("click", () => activateTab(button, "[data-stage]", "stage", (key) => {
    $("#pipeline-detail").innerHTML = detailMarkup(stages[key], "stage");
  }));
});
enableTabKeyboard(pipelineGroup, "[data-stage]");
$("#pipeline-detail").innerHTML = detailMarkup(stages.ingest, "stage");

$("#command-form").addEventListener("input", updateCommand);
$("#copy-command").addEventListener("click", copyCommand);
updateCommand();
