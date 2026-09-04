import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js";

const body = document.body;
const canvas = document.querySelector("#journey-canvas");
const enterButton = document.querySelector("#enter-button");
const tourButton = document.querySelector("#tour-button");
const panelClose = document.querySelector("#panel-close");
const roomButtons = [...document.querySelectorAll("[data-room]")];
const mapButtons = [...document.querySelectorAll("[data-map-zone]")];
const fallbackButtons = [...document.querySelectorAll("[data-fallback-room]")];
const sceneStatus = document.querySelector("#scene-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).get("motion") === "reduce";

if (reducedMotion) body.dataset.motion = "reduced";

const ZONES = {
  courtyard: {
    index: 1,
    slug: "COURTYARD",
    name: "庭院",
    role: "期待",
    title: "先看见一盏灯，<br /><em>再决定走进去。</em>",
    intro: "石径把视线带向家门。水、树影和窗里的暖光先建立“有人在等你”的感觉，入口因此不只是加载页，而是故事的第一幕。",
    panelTitle: "庭院不是装饰，是情绪门槛",
    description: "进入房屋之前，先给访客一个能停留的外部空间。动线只做一件事：从院门、石径到亮着的家门。",
    space: "水庭在左，树与石灯在右，中轴石径保持清楚",
    display: "门牌、季节、时间与一句欢迎语",
    content: "真实住宅外观、城市与季节记忆",
    layout: "前庭 / 入口",
    status: "庭院晚风 · 家门已亮",
    next: "foyer",
    camera: [0, 4.4, 15.4],
    target: [0, 1.5, 4.7],
    anchor: [0, 0, 7.2]
  },
  foyer: {
    index: 2,
    slug: "FOYER",
    name: "玄关",
    role: "身份",
    title: "进门第一眼，<br /><em>只回答“我是谁”。</em>",
    intro: "玄关不展示完整履历。门牌、鞋凳、钥匙盘和一件代表性的旧物，用最少的信息建立住客身份。",
    panelTitle: "玄关用一件物品建立身份",
    description: "访客穿过门后得到一个短暂停顿。这里适合放姓名、当前状态和一件英雄物件，不把所有项目堵在入口。",
    space: "中央窄厅、换鞋凳、低柜和通往左右房间的明确开口",
    display: "门牌、英雄物件、当前身份与路线选择",
    content: "真实姓名、个人标志物和一句自我描述",
    layout: "中轴 / 分流",
    status: "已进入玄关 · 左客厅 / 右书房",
    next: "living",
    camera: [0, 2.45, 5.7],
    target: [0, 1.3, 2.35],
    anchor: [0, 0, 2.8]
  },
  living: {
    index: 3,
    slug: "LIVING",
    name: "客厅",
    role: "关系",
    title: "客厅保存的，<br /><em>是人与人的距离。</em>",
    intro: "围合座位、照片墙和低位暖灯让内容从“关于我”转向“我在乎谁”。布局强调围坐而不是陈列。",
    panelTitle: "用围合布局讲关系",
    description: "沙发、两把椅子和茶几构成可以交谈的中心；墙上的照片只保留少量可公开记忆，避免把住宅变成图片墙。",
    space: "左侧围合座席、中央地毯、壁炉和关系照片墙",
    display: "照片、共同经历、人物关系和环境声音",
    content: "经授权照片、时间地点与一句共同记忆",
    layout: "围合 / 交流",
    status: "客厅暖灯 · 关系记忆",
    next: "study",
    camera: [-2.0, 3.05, 3.15],
    target: [-4.25, 1.15, 0.25],
    anchor: [-4.2, 0, 0.35]
  },
  study: {
    index: 4,
    slug: "STUDY",
    name: "书房",
    role: "作品",
    title: "把做成的事，<br /><em>放回工作现场。</em>",
    intro: "书桌、样机架与项目屏组成证据链。点击屏幕进入完整案例，空间负责吸引靠近，DOM 负责详细结果。",
    panelTitle: "书房必须展示真实结果",
    description: "不同于客厅的围合布局，书房采用面向工作台的单向构图。主屏、草图和样机分别对应成果、过程和可验证证据。",
    space: "右侧 L 形书桌、项目屏、书架与样机台",
    display: "项目封面、过程草图、交互原型与结果链接",
    content: "真实案例、视频、代码仓库和角色说明",
    layout: "单向 / 工作",
    status: "书房台灯 · 项目证据",
    next: "gallery",
    camera: [2.0, 3.05, 3.15],
    target: [4.25, 1.35, 0.1],
    anchor: [4.2, 0, 0.25]
  },
  gallery: {
    index: 5,
    slug: "GALLERY",
    name: "记忆廊",
    role: "时间",
    title: "沿着光，<br /><em>看见一个人如何变化。</em>",
    intro: "记忆廊不是作品网格，而是一条时间轴。不同尺寸的画框、年份和门洞组织阶段，让变化通过行进被感知。",
    panelTitle: "时间应该被走过，而不只是滚动",
    description: "三组框架分别承载起点、转折和当下。镜头沿中轴后移，画框灯依次增强，把普通时间线转成空间节奏。",
    space: "后部狭长中轴、三组年份框与通往露台的亮门",
    display: "年份、阶段封面、转折事件与前后对比",
    content: "真实时间线、关键选择和阶段性作品",
    layout: "线性 / 时间",
    status: "记忆廊壁灯 · 时间向后展开",
    next: "terrace",
    camera: [0.65, 2.6, 0.9],
    target: [-1.2, 1.65, -3.0],
    anchor: [0, 0, -3]
  },
  terrace: {
    index: 6,
    slug: "TERRACE",
    name: "露台",
    role: "未来",
    title: "最后一间房，<br /><em>没有屋顶。</em>",
    intro: "路线从封闭室内重新走向天空。后院长椅、灯笼和远处光带收束来路，只留下一个关于下一程的行动。",
    panelTitle: "以开放远景结束住宅路线",
    description: "露台降低信息密度，让访客回望整套住宅。这里不继续增加项目，而是展示下一阶段和唯一明确行动。",
    space: "后院木平台、低矮长椅、灯笼与横向远景",
    display: "未来计划、所在城市、联系方式或下一项目",
    content: "真实目标、可公开地点和单一行动按钮",
    layout: "开放 / 回望",
    status: "后院夜色 · 下一程仍亮着",
    next: "courtyard",
    camera: [0, 3.2, -1.95],
    target: [1.2, 0.92, -6.5],
    anchor: [0, 0, -6.4]
  }
};

const ZONE_ORDER = Object.keys(ZONES);
const LIGHT_SPECS = [
  { id: "courtyard-lantern", emitter: "stone-lantern", zone: "courtyard", range: 4.5, color: 0xffb96f, intensity: 20, min: 0.35 },
  { id: "foyer-pendant", emitter: "foyer-shade", zone: "foyer", range: 5.5, color: 0xffb773, intensity: 31, min: 0.68 },
  { id: "living-floor-lamp", emitter: "living-shade", zone: "living", range: 5.5, color: 0xffb069, intensity: 29, min: 0.22 },
  { id: "study-desk-lamp", emitter: "study-shade", zone: "study", range: 4.2, color: 0xffc27f, intensity: 24, min: 0.2 },
  { id: "gallery-sconce", emitter: "gallery-sconce-pair", zone: "gallery", range: 4.5, color: 0xffc58b, intensity: 18, min: 0.18 },
  { id: "terrace-lantern", emitter: "terrace-lantern", zone: "terrace", range: 4.5, color: 0xffae68, intensity: 22, min: 0.28 }
];

let renderer;
let scene;
let camera;
let controls;
let world;
let raycaster;
let pointer;
let cameraDestination;
let targetDestination;
let cameraAnimating = false;
let currentZone = "courtyard";
let doorPivot;
let doorProgress = 0;
let doorTarget = 0;
let water;
let leaves;
let dust;
let animationFrame = 0;
const clickables = [];
const beacons = new Map();
const lights = new Map();
const clock = new THREE.Clock();
const entrance = { active: false, start: 0, duration: 4200, cameraCurve: null, targetCurve: null, fromTour: false };
const tour = {
  active: false,
  start: 0,
  step: -1,
  schedule: [
    { at: 0, type: "zone", zone: "courtyard" },
    { at: 2300, type: "entrance" },
    { at: 6700, type: "zone", zone: "foyer" },
    { at: 10800, type: "zone", zone: "living" },
    { at: 15100, type: "zone", zone: "study" },
    { at: 19400, type: "zone", zone: "gallery" },
    { at: 23800, type: "zone", zone: "terrace" },
    { at: 29200, type: "finish", zone: "courtyard" }
  ]
};

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function validateLevelData() {
  const errors = [];
  ZONE_ORDER.forEach((id, index) => {
    const zone = ZONES[id];
    if (zone.index !== index + 1) errors.push(`${id}: non-deterministic index`);
    if (Math.abs(zone.anchor[1]) > 0.001) errors.push(`${id}: anchor leaves gameplay plane`);
    if (!ZONES[zone.next]) errors.push(`${id}: missing next zone ${zone.next}`);
  });
  LIGHT_SPECS.forEach((spec) => {
    if (!ZONES[spec.zone]) errors.push(`${spec.id}: missing zone`);
    if (!spec.emitter || spec.range <= 0 || spec.intensity <= 0) errors.push(`${spec.id}: incomplete emitter inventory`);
  });
  if (errors.length) throw new Error(`Journey level data invalid: ${errors.join("; ")}`);
}

function scalePose(position, target, id) {
  const next = new THREE.Vector3(...position);
  const look = new THREE.Vector3(...target);
  if (innerWidth < 760) {
    const scale = id === "courtyard" ? 1.27 : id === "terrace" ? 1.08 : 1;
    next.sub(look).multiplyScalar(scale).add(look);
  }
  return { position: next, target: look };
}

function setCameraDestination(id, immediate = false) {
  if (!camera || !controls) return;
  const pose = scalePose(ZONES[id].camera, ZONES[id].target, id);
  cameraDestination.copy(pose.position);
  targetDestination.copy(pose.target);
  cameraAnimating = !immediate && !reducedMotion;
  if (!cameraAnimating) {
    camera.position.copy(cameraDestination);
    controls.target.copy(targetDestination);
    controls.update();
  }
}

function updateZoneUi(id) {
  const zone = ZONES[id];
  const next = ZONES[zone.next];
  body.dataset.zone = id;
  setText("#zone-kicker", `${String(zone.index).padStart(2, "0")} / ${zone.slug} · ${zone.name}`);
  document.querySelector("#zone-title").innerHTML = zone.title;
  setText("#zone-intro", zone.intro);
  setText("#panel-room", zone.slug);
  setText("#panel-layout", zone.layout);
  setText("#panel-title", zone.panelTitle);
  setText("#panel-description", zone.description);
  setText("#panel-space", zone.space);
  setText("#panel-display", zone.display);
  setText("#panel-content", zone.content);
  setText("#progress-index", String(zone.index).padStart(2, "0"));
  document.querySelector("#progress-bar").style.width = `${(zone.index / ZONE_ORDER.length) * 100}%`;
  setText("#map-caption", `当前位置：${zone.name} · 下一站：${next.name}`);
  sceneStatus.textContent = zone.status;
  if (id === "courtyard") {
    setText("#enter-label", "沿石径走进家门");
    setText("#enter-note", "约 4 秒");
  } else {
    setText("#enter-label", `前往下一站：${next.name}`);
    setText("#enter-note", `${zone.index} → ${next.index}`);
  }
  roomButtons.forEach((button) => {
    const active = button.dataset.room === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  mapButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mapZone === id));
}

function stopTour({ cancelEntrance = true } = {}) {
  if (!tour.active && !entrance.active) return;
  tour.active = false;
  tour.step = -1;
  tourButton.classList.remove("is-playing");
  tourButton.querySelector("span").textContent = "▶";
  tourButton.querySelector("strong").textContent = "完整导览";
  tourButton.querySelector("small").textContent = "约 30 秒";
  if (cancelEntrance && entrance.active) {
    entrance.active = false;
    if (controls) controls.enabled = true;
  }
}

function selectZone(id, { fromDirector = false, immediate = false, updateHistory = true } = {}) {
  if (!ZONES[id]) return;
  if (!fromDirector) stopTour();
  entrance.active = false;
  if (controls) controls.enabled = true;
  currentZone = id;
  doorTarget = id === "courtyard" ? 0 : 1;
  body.dataset.journey = "idle";
  updateZoneUi(id);
  setCameraDestination(id, immediate);
  beacons.forEach((beacon, zoneId) => {
    beacon.userData.selected = zoneId === id;
    beacon.material.opacity = zoneId === id ? 0.95 : 0.35;
  });
  if (updateHistory) {
    const nextUrl = id === "courtyard" ? `${location.pathname}${location.search}` : `#${id}`;
    history.replaceState(null, "", nextUrl);
  }
}

function startEntrance({ fromTour = false } = {}) {
  if (!camera || !controls) {
    selectZone("foyer", { fromDirector: fromTour, immediate: true });
    return;
  }
  if (!fromTour) stopTour();
  if (reducedMotion) {
    doorProgress = 1;
    doorTarget = 1;
    if (doorPivot) doorPivot.rotation.y = -1.22;
    selectZone("foyer", { fromDirector: fromTour, immediate: true });
    return;
  }
  entrance.active = true;
  entrance.fromTour = fromTour;
  entrance.start = performance.now();
  entrance.duration = 4200;
  entrance.cameraCurve = new THREE.CatmullRomCurve3([
    camera.position.clone(),
    new THREE.Vector3(0, 3.35, 10.2),
    new THREE.Vector3(0, 2.75, 7.15),
    new THREE.Vector3(0, 2.35, 5.1),
    new THREE.Vector3(0, 2.3, 3.85)
  ]);
  entrance.targetCurve = new THREE.CatmullRomCurve3([
    controls.target.clone(),
    new THREE.Vector3(0, 1.45, 5.1),
    new THREE.Vector3(0, 1.5, 4.5),
    new THREE.Vector3(0, 1.35, 2.8),
    new THREE.Vector3(0, 1.3, 2.25)
  ]);
  doorTarget = 1;
  cameraAnimating = false;
  controls.enabled = false;
  body.dataset.journey = "entering";
  sceneStatus.textContent = "沿石径靠近 · 家门正在打开";
}

function startTour() {
  if (tour.active) {
    stopTour();
    return;
  }
  stopTour();
  tour.active = true;
  tour.start = performance.now();
  tour.step = -1;
  tourButton.classList.add("is-playing");
  tourButton.querySelector("span").textContent = "Ⅱ";
  tourButton.querySelector("strong").textContent = "暂停导览";
  tourButton.querySelector("small").textContent = "正在播放";
}

function makeMaterial(color, roughness = 0.78, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geometry, material, position, rotation = [0, 0, 0], options = {}) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = options.castShadow ?? true;
  object.receiveShadow = options.receiveShadow ?? true;
  if (options.zone) object.userData.zone = options.zone;
  parent.add(object);
  return object;
}

function rounded(parent, size, color, position, radius = 0.08, options = {}) {
  const geometry = new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, ...size.map((value) => value / 2)));
  return addMesh(parent, geometry, options.material || makeMaterial(color, options.roughness ?? 0.78, options.metalness ?? 0), position, options.rotation || [0, 0, 0], options);
}

function canvasTexture(width, height, paint) {
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  paint(surface.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function posterTexture(kind) {
  return canvasTexture(480, 560, (context, width, height) => {
    const palettes = {
      identity: ["#e8d9c3", "#6e4935", "#263c37"],
      relation: ["#d8c6ae", "#9e5f47", "#596a50"],
      project: ["#1d2928", "#d69563", "#e9dfcb"],
      timeline: ["#d9c9b1", "#5d6673", "#a1644b"]
    };
    const palette = palettes[kind] || palettes.identity;
    context.fillStyle = palette[0];
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette[1];
    context.beginPath();
    context.arc(width * 0.62, height * 0.36, 112, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = palette[2];
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(45, height - 72);
    context.bezierCurveTo(120, 160, 310, 380, width - 38, 85);
    context.stroke();
    context.fillStyle = palette[2];
    context.font = "700 22px monospace";
    context.fillText(kind.toUpperCase(), 42, 54);
    context.font = "500 13px sans-serif";
    context.fillText("PROTOTYPE CONTENT SLOT", 42, 82);
  });
}

function screenTexture() {
  return canvasTexture(720, 440, (context, width, height) => {
    context.fillStyle = "#14201e";
    context.fillRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#d98b59");
    gradient.addColorStop(1, "#354d45");
    context.fillStyle = gradient;
    context.fillRect(30, 30, width - 60, height - 60);
    context.fillStyle = "rgba(255,244,225,.88)";
    context.font = "700 20px monospace";
    context.fillText("STUDY / PROJECT 01", 58, 74);
    context.fillStyle = "rgba(255,244,225,.62)";
    context.font = "500 12px sans-serif";
    context.fillText("RESULT · PROCESS · PROOF", 58, 102);
    context.fillStyle = "#f0c999";
    context.fillRect(58, 142, 268, 150);
    context.fillStyle = "#263934";
    context.fillRect(360, 142, 282, 11);
    context.fillRect(360, 175, 216, 8);
    context.fillRect(360, 204, 250, 8);
    context.font = "700 13px monospace";
    context.fillStyle = "rgba(255,244,225,.7)";
    context.fillText("REPLACE WITH TRUE CASE", 360, 270);
  });
}

function horizonTexture() {
  return canvasTexture(1024, 420, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#303950");
    gradient.addColorStop(0.56, "#685b67");
    gradient.addColorStop(0.77, "#c08062");
    gradient.addColorStop(1, "#28312d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(18,23,28,.78)";
    for (let index = 0; index < 24; index += 1) {
      const x = index * 47;
      const buildingHeight = 38 + ((index * 37) % 95);
      context.fillRect(x, height - buildingHeight, 35 + (index % 3) * 9, buildingHeight);
      context.fillStyle = index % 4 === 0 ? "rgba(255,210,145,.55)" : "rgba(18,23,28,.78)";
      context.fillRect(x + 9, height - buildingHeight + 18, 3, 3);
      context.fillStyle = "rgba(18,23,28,.78)";
    }
  });
}

function tagZone(root, id) {
  root.userData.zone = id;
  root.traverse((child) => { child.userData.zone = id; });
  clickables.push(root);
}

function addBeacon(parent, id, position) {
  const texture = canvasTexture(128, 128, (context, width, height) => {
    const gradient = context.createRadialGradient(width / 2, height / 2, 1, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.16, "rgba(255,208,155,.96)");
    gradient.addColorStop(0.4, "rgba(217,139,89,.45)");
    gradient.addColorStop(1, "rgba(217,139,89,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.35, toneMapped: false }));
  beacon.position.set(...position);
  beacon.scale.setScalar(0.75);
  beacon.userData.zone = id;
  parent.add(beacon);
  beacons.set(id, beacon);
}

function registerLight(spec, light, emitter) {
  light.userData.lightId = spec.id;
  light.userData.zone = spec.zone;
  light.userData.baseIntensity = spec.intensity;
  light.userData.minFactor = spec.min;
  emitter.userData.emitterId = spec.emitter;
  lights.set(spec.id, { spec, light, emitter });
}

function buildWorld() {
  world = new THREE.Group();
  world.name = "Courtyard Memory House";
  scene.add(world);

  const plaster = makeMaterial(0xb9a78f, 0.94);
  const plasterDark = makeMaterial(0x867866, 0.95);
  const oak = makeMaterial(0x8b5b3d, 0.8);
  const lightOak = makeMaterial(0xb27b54, 0.82);
  const walnut = makeMaterial(0x493128, 0.74);
  const linen = makeMaterial(0xc9b79e, 0.98);
  const cream = makeMaterial(0xe0d1ba, 1);
  const clay = makeMaterial(0x9f6047, 0.9);
  const moss = makeMaterial(0x52654a, 0.92);
  const darkMetal = makeMaterial(0x252628, 0.44, 0.18);
  const stone = makeMaterial(0x8e897d, 0.98);

  // One accessible plane: courtyard, house and terrace all sit at y = 0.
  addMesh(world, new THREE.BoxGeometry(16, 0.12, 7.6), makeMaterial(0x44543f, 1), [0, -0.07, 8.25], [0, 0, 0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(14, 0.16, 9.2), makeMaterial(0x704a35, 0.86), [0, -0.06, 0], [0, 0, 0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(14, 0.14, 3.8), makeMaterial(0x6d503c, 0.88), [0, -0.05, -6.45], [0, 0, 0], { castShadow: false });

  // Courtyard stone route visibly leads to the door.
  for (let index = 0; index < 9; index += 1) {
    const z = 11.3 - index * 0.78;
    rounded(world, [1.25 + (index % 2) * 0.16, 0.07, 0.48], 0x918a79, [Math.sin(index * 1.8) * 0.18, 0.02, z], 0.15, { material: stone, rotation: [0, (index % 3 - 1) * 0.05, 0], castShadow: false, zone: "courtyard" });
  }
  const pondMaterial = new THREE.MeshStandardMaterial({ color: 0x506874, roughness: 0.28, metalness: 0.05, transparent: true, opacity: 0.9 });
  water = addMesh(world, new THREE.CircleGeometry(2.15, 48), pondMaterial, [-4.4, 0.015, 8.55], [-Math.PI / 2, 0, 0], { castShadow: false, receiveShadow: true, zone: "courtyard" });
  [[-5.35, 8.0], [-4.55, 9.3], [-3.6, 8.25]].forEach(([x, z], index) => rounded(world, [0.72 + index * 0.08, 0.11, 0.52], 0x878276, [x, 0.05, z], 0.22, { material: stone, rotation: [0, index * 0.5, 0], castShadow: false, zone: "courtyard" }));
  for (let index = 0; index < 18; index += 1) {
    addMesh(world, new THREE.CylinderGeometry(0.015, 0.025, 0.65 + (index % 4) * 0.12, 6), moss, [-5.7 + (index % 6) * 0.48, 0.34, 7.3 + Math.floor(index / 6) * 0.6], [0, 0, (index % 3 - 1) * 0.12], { zone: "courtyard" });
  }

  // Tree and garden massing.
  const tree = new THREE.Group();
  tree.position.set(4.65, 0, 8.45);
  world.add(tree);
  addMesh(tree, new THREE.CylinderGeometry(0.25, 0.42, 3.5, 14), walnut, [0, 1.75, 0], [0.05, 0, -0.08], { zone: "courtyard" });
  leaves = new THREE.Group();
  tree.add(leaves);
  [[0,3.6,0],[-.7,3.35,.15],[.72,3.48,-.2],[-.28,4.14,-.1],[.35,3.95,.42]].forEach((position, index) => {
    const crown = addMesh(leaves, new THREE.SphereGeometry(0.88 + (index % 2) * 0.14, 18, 12), makeMaterial(index % 2 ? 0x536849 : 0x607553, 0.94), position, [0,0,0], { zone: "courtyard" });
    crown.scale.set(1.05, 0.8, 1.0);
  });

  // House shell with openings at both ends of the central route.
  addMesh(world, new THREE.BoxGeometry(0.2, 4.8, 9.2), plasterDark, [-7.0, 2.4, 0], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(0.2, 4.8, 9.2), plasterDark, [7.0, 2.4, 0], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(6.15, 4.8, 0.2), plaster, [-3.95, 2.4, 4.58], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(6.15, 4.8, 0.2), plaster, [3.95, 2.4, 4.58], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(5.7, 4.8, 0.2), plasterDark, [-4.15, 2.4, -4.58], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(5.7, 4.8, 0.2), plasterDark, [4.15, 2.4, -4.58], [0,0,0], { castShadow: false });
  // Foyer corridor partitions, with short openings before living and study.
  addMesh(world, new THREE.BoxGeometry(0.14, 3.9, 2.15), plasterDark, [-1.55, 1.95, 3.48], [0,0,0], { castShadow: false });
  addMesh(world, new THREE.BoxGeometry(0.14, 3.9, 2.15), plasterDark, [1.55, 1.95, 3.48], [0,0,0], { castShadow: false });
  [1.55, -1.55].forEach((x) => rounded(world, [0.16, 0.22, 5.5], 0x5d4433, [x, 4.05, -0.35], 0.04, { material: walnut, castShadow: false }));
  rounded(world, [14.2, 0.2, 0.22], 0x5d4433, [0, 4.55, 4.48], 0.04, { material: walnut, castShadow: false });

  // Warm windows make the façade readable before entry.
  const windowGlow = new THREE.MeshBasicMaterial({ color: 0xe9aa6e, transparent: true, opacity: 0.72, toneMapped: false });
  [-4.1, 4.1].forEach((x) => {
    addMesh(world, new THREE.PlaneGeometry(2.45, 2.25), windowGlow, [x, 2.45, 4.69], [0,0,0], { castShadow: false, receiveShadow: false, zone: "courtyard" });
    [-1.23, 1.23].forEach((offset) => rounded(world, [0.09, 2.45, 0.12], 0x493128, [x + offset, 2.45, 4.72], 0.02, { material: walnut, zone: "courtyard" }));
    rounded(world, [2.55, 0.1, 0.12], 0x493128, [x, 3.63, 4.72], 0.02, { material: walnut, zone: "courtyard" });
    rounded(world, [2.55, 0.1, 0.12], 0x493128, [x, 1.27, 4.72], 0.02, { material: walnut, zone: "courtyard" });
  });

  // Hinged front door and visible threshold light.
  const doorFrame = new THREE.Group();
  doorFrame.position.set(0, 0, 4.65);
  world.add(doorFrame);
  rounded(doorFrame, [2.15, 0.18, 0.24], 0x493128, [0, 3.35, 0], 0.04, { material: walnut, zone: "courtyard" });
  [-1.0, 1.0].forEach((x) => rounded(doorFrame, [0.18, 3.5, 0.24], 0x493128, [x, 1.66, 0], 0.04, { material: walnut, zone: "courtyard" }));
  doorPivot = new THREE.Group();
  doorPivot.position.set(-0.9, 0, 0.05);
  doorFrame.add(doorPivot);
  const door = rounded(doorPivot, [1.78, 3.18, 0.16], 0x765039, [0.89, 1.59, 0], 0.05, { material: oak, zone: "courtyard" });
  rounded(doorPivot, [0.9, 1.25, 0.05], 0x9a6a49, [0.89, 2.05, -0.09], 0.02, { material: lightOak, zone: "courtyard" });
  addMesh(doorPivot, new THREE.SphereGeometry(0.07, 16, 12), makeMaterial(0xbda373, 0.38, 0.45), [1.5, 1.5, 0.13], [0,0,0], { zone: "courtyard" });
  // The visible door is the spatial equivalent of the DOM enter action.
  // Marking it as the foyer makes a raycast hit start the entrance sequence.
  tagZone(doorFrame, "foyer");

  // Foyer: identity object, bench and pendant.
  const foyer = new THREE.Group();
  world.add(foyer);
  rounded(foyer, [2.4, 0.08, 1.35], 0x7e6e58, [0, 0.05, 3.0], 0.16, { material: makeMaterial(0x7e6e58, 1), zone: "foyer" });
  rounded(foyer, [1.05, 0.34, 0.48], 0xa87855, [-0.72, 0.44, 2.65], 0.1, { material: lightOak, zone: "foyer" });
  [-1.08, -0.36].forEach((x) => rounded(foyer, [0.07, 0.38, 0.07], 0x493128, [x, 0.2, 2.65], 0.02, { material: walnut, zone: "foyer" }));
  rounded(foyer, [0.45, 1.0, 0.4], 0x644633, [1.18, 0.56, 2.35], 0.07, { material: walnut, zone: "foyer" });
  const identityMaterial = new THREE.MeshStandardMaterial({ map: posterTexture("identity"), roughness: 0.8 });
  rounded(foyer, [0.72, 1.0, 0.06], 0x493128, [0, 1.9, 1.9], 0.025, { material: walnut, zone: "foyer" });
  addMesh(foyer, new THREE.PlaneGeometry(0.62, 0.88), identityMaterial, [0, 1.9, 1.94], [0,0,0], { castShadow: false, zone: "foyer" });
  addMesh(foyer, new THREE.CylinderGeometry(0.025, 0.025, 1.6, 10), darkMetal, [0, 4.2, 2.35], [0,0,0], { castShadow: false });
  const foyerShade = addMesh(foyer, new THREE.CylinderGeometry(0.32, 0.46, 0.58, 30, 1, true), new THREE.MeshStandardMaterial({ color: 0xd6b58c, emissive: 0xe8a366, emissiveIntensity: 0.24, roughness: 0.95, side: THREE.DoubleSide }), [0, 3.42, 2.35]);
  const foyerLight = new THREE.PointLight(0xffb773, 31, 5.5, 2);
  foyerLight.position.set(0, 3.25, 2.4);
  foyerLight.castShadow = true;
  foyerLight.shadow.mapSize.set(512, 512);
  world.add(foyerLight);
  registerLight(LIGHT_SPECS[1], foyerLight, foyerShade);
  tagZone(foyer, "foyer");

  // Courtyard stone lantern and attached light.
  const stoneLantern = new THREE.Group();
  stoneLantern.position.set(2.6, 0, 7.0);
  world.add(stoneLantern);
  rounded(stoneLantern, [0.5, 0.12, 0.5], 0x858075, [0, 0.1, 0], 0.05, { material: stone, zone: "courtyard" });
  rounded(stoneLantern, [0.16, 0.92, 0.16], 0x858075, [0, 0.58, 0], 0.04, { material: stone, zone: "courtyard" });
  const lanternEmitter = rounded(stoneLantern, [0.42, 0.38, 0.42], 0xe4b878, [0, 1.07, 0], 0.08, { material: new THREE.MeshStandardMaterial({ color: 0xd8b17a, emissive: 0xf3a85e, emissiveIntensity: 0.6, roughness: 0.84 }), zone: "courtyard" });
  rounded(stoneLantern, [0.68, 0.12, 0.68], 0x858075, [0, 1.35, 0], 0.05, { material: stone, zone: "courtyard" });
  const courtyardLight = new THREE.PointLight(0xffb96f, 20, 4.5, 2);
  courtyardLight.position.set(2.6, 1.18, 7.0);
  world.add(courtyardLight);
  registerLight(LIGHT_SPECS[0], courtyardLight, lanternEmitter);

  // Living room: conversational layout, photos and fireplace.
  const living = new THREE.Group();
  world.add(living);
  rounded(living, [5.25, 0.06, 3.45], 0xaa9475, [-4.25, 0.04, 0.55], 0.18, { material: makeMaterial(0xaa9475, 1), castShadow: false, zone: "living" });
  rounded(living, [3.25, 0.46, 1.2], 0xc7b69d, [-4.25, 0.48, -0.35], 0.18, { material: linen, zone: "living" });
  rounded(living, [3.25, 1.05, 0.32], 0xc7b69d, [-4.25, 1.02, -0.83], 0.13, { material: linen, zone: "living" });
  [-5.18, -4.25, -3.32].forEach((x, index) => rounded(living, [0.82, 0.5, 0.36], index === 1 ? 0xa8684e : 0xd6c6ae, [x, 1.05, -0.58], 0.12, { material: index === 1 ? clay : cream, zone: "living" }));
  rounded(living, [2.1, 0.17, 1.0], 0x9a6848, [-4.25, 0.57, 1.35], 0.27, { material: lightOak, zone: "living" });
  [-4.95, -3.55].forEach((x) => addMesh(living, new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12), darkMetal, [x, 0.3, 1.35], [0,0,0], { zone: "living" }));
  // Photo wall.
  [[-5.55,1.95,.7,.9],[-4.7,2.2,.6,.74],[-3.88,1.9,.72,.96]].forEach(([x,y,w,h], index) => {
    rounded(living, [w + 0.1, h + 0.1, 0.08], 0x493128, [x, y, -4.42], 0.03, { material: walnut, zone: "living" });
    addMesh(living, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: posterTexture("relation"), roughness: 0.85 }), [x, y, -4.36], [0,0,0], { castShadow: false, zone: "living" });
  });
  // Fireplace and floor lamp.
  rounded(living, [1.28, 1.35, 0.42], 0x4e4237, [-6.52, 0.75, 1.15], 0.06, { material: makeMaterial(0x4e4237, 0.92), zone: "living" });
  const fire = rounded(living, [0.82, 0.56, 0.05], 0xe4975e, [-6.29, 0.74, 1.15], 0.05, { material: new THREE.MeshStandardMaterial({ color: 0xc96743, emissive: 0xef7847, emissiveIntensity: 1.2, roughness: 0.8 }), zone: "living" });
  addMesh(living, new THREE.CylinderGeometry(0.04, 0.05, 2.25, 12), darkMetal, [-2.42, 1.15, 0.0], [0,0,0], { zone: "living" });
  const livingShade = addMesh(living, new THREE.CylinderGeometry(0.34, 0.45, 0.58, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8ba91, emissive: 0xe8a366, emissiveIntensity: 0.25, roughness: 0.95, side: THREE.DoubleSide }), [-2.42, 2.35, 0.0], [0,0,0], { zone: "living" });
  const livingLight = new THREE.PointLight(0xffb069, 29, 5.5, 2);
  livingLight.position.set(-2.42, 2.25, 0.0);
  world.add(livingLight);
  registerLight(LIGHT_SPECS[2], livingLight, livingShade);
  fire.userData.emitterId = "living-fireplace";
  tagZone(living, "living");

  // Study: directional work layout and project proof screen.
  const study = new THREE.Group();
  world.add(study);
  rounded(study, [3.5, 0.18, 1.15], 0x8b5b3d, [4.35, 1.12, -0.75], 0.08, { material: lightOak, zone: "study" });
  [3.0, 5.7].forEach((x) => rounded(study, [0.1, 1.08, 0.1], 0x493128, [x, 0.55, -0.75], 0.02, { material: walnut, zone: "study" }));
  const monitorMaterial = new THREE.MeshStandardMaterial({ map: screenTexture(), emissiveMap: screenTexture(), emissive: 0xd98b59, emissiveIntensity: 0.28, roughness: 0.4 });
  rounded(study, [1.78, 1.12, 0.1], 0x252628, [4.1, 1.95, -1.02], 0.06, { material: darkMetal, zone: "study" });
  addMesh(study, new THREE.PlaneGeometry(1.56, 0.88), monitorMaterial, [4.1, 1.95, -0.96], [0,0,0], { castShadow: false, receiveShadow: false, zone: "study" });
  rounded(study, [1.25, 0.15, 2.5], 0x8b5b3d, [6.1, 1.12, 0.9], 0.07, { material: lightOak, zone: "study" });
  // Shelves and books.
  [0.7, 1.55, 2.4].forEach((y) => rounded(study, [2.55, 0.11, 0.4], 0x8b5b3d, [4.55, y, -4.25], 0.04, { material: oak, zone: "study" }));
  [-1.2, 1.2].forEach((x) => rounded(study, [0.1, 2.6, 0.4], 0x8b5b3d, [4.55 + x, 1.35, -4.25], 0.04, { material: oak, zone: "study" }));
  const bookColors = [0x57674e, 0x9c6048, 0xc4a77e, 0x4b5961];
  for (let index = 0; index < 12; index += 1) {
    const row = index < 6 ? 0 : 1;
    const localIndex = index % 6;
    rounded(study, [0.17, 0.38 + (index % 3) * 0.05, 0.28], bookColors[index % bookColors.length], [3.65 + localIndex * 0.31, 1.0 + row * 0.85, -4.1], 0.015, { material: makeMaterial(bookColors[index % bookColors.length], 0.92), rotation: [0,0,index % 4 === 0 ? 0.07 : 0], zone: "study" });
  }
  // Visible desk lamp and attached light.
  addMesh(study, new THREE.CylinderGeometry(0.035, 0.045, 0.78, 10), darkMetal, [5.45, 1.56, -0.68], [0,0,-0.32], { zone: "study" });
  const studyShade = addMesh(study, new THREE.ConeGeometry(0.25, 0.38, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xb89062, emissive: 0xe9a76a, emissiveIntensity: 0.22, roughness: 0.82, side: THREE.DoubleSide }), [5.32, 1.92, -0.68], [0,0,-0.32], { zone: "study" });
  const studyLight = new THREE.PointLight(0xffc27f, 24, 4.2, 2);
  studyLight.position.set(5.2, 1.72, -0.45);
  world.add(studyLight);
  registerLight(LIGHT_SPECS[3], studyLight, studyShade);
  tagZone(study, "study");

  // Memory gallery: a linear route with sequential frames.
  const gallery = new THREE.Group();
  world.add(gallery);
  rounded(gallery, [2.5, 0.05, 5.2], 0x776854, [0, 0.04, -2.05], 0.1, { material: makeMaterial(0x776854, 0.98), castShadow: false, zone: "gallery" });
  [[-1.35,-2.0,1.05,1.35],[1.35,-2.85,.9,1.15],[-1.35,-3.65,.78,1.0]].forEach(([x,z,w,h], index) => {
    rounded(gallery, [w + 0.12, h + 0.12, 0.08], 0x493128, [x, 1.75 + index * 0.12, z], 0.03, { material: walnut, rotation: [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0], zone: "gallery" });
    const art = addMesh(gallery, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: posterTexture("timeline"), roughness: 0.84 }), [x + (x < 0 ? 0.045 : -0.045), 1.75 + index * 0.12, z], [0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { castShadow: false, zone: "gallery" });
    art.userData.timelineIndex = index;
  });
  const sconceLeft = rounded(gallery, [0.16, 0.34, 0.18], 0xd6b487, [-1.28, 2.75, -2.45], 0.04, { material: new THREE.MeshStandardMaterial({ color: 0xd6b487, emissive: 0xf0b978, emissiveIntensity: 0.38, roughness: 0.85 }), zone: "gallery" });
  const sconceRight = rounded(gallery, [0.16, 0.34, 0.18], 0xd6b487, [1.28, 2.75, -3.45], 0.04, { material: sconceLeft.material, zone: "gallery" });
  const galleryLight = new THREE.PointLight(0xffc58b, 18, 4.5, 2);
  galleryLight.position.set(0, 2.45, -3.0);
  world.add(galleryLight);
  const sconcePair = new THREE.Group();
  sconcePair.userData.emitters = [sconceLeft, sconceRight];
  registerLight(LIGHT_SPECS[4], galleryLight, sconcePair);
  tagZone(gallery, "gallery");

  // Terrace: open, low-density final room and horizon.
  const terrace = new THREE.Group();
  world.add(terrace);
  for (let index = 0; index < 18; index += 1) {
    addMesh(terrace, new THREE.BoxGeometry(0.74, 0.025, 3.55), makeMaterial(index % 2 ? 0x6f4c39 : 0x79523c, 0.88), [-6.65 + index * 0.78, 0.03, -6.45], [0,0,0], { castShadow: false, zone: "terrace" });
  }
  addMesh(terrace, new THREE.PlaneGeometry(13.5, 4.4), new THREE.MeshBasicMaterial({ map: horizonTexture(), toneMapped: false }), [0, 2.2, -8.28], [0,0,0], { castShadow: false, receiveShadow: false, zone: "terrace" });
  rounded(terrace, [3.4, 0.34, 0.82], 0x8b5b3d, [-3.05, 0.55, -6.85], 0.14, { material: lightOak, zone: "terrace" });
  rounded(terrace, [3.4, 0.72, 0.22], 0x8b5b3d, [-3.05, 0.9, -7.14], 0.1, { material: lightOak, zone: "terrace" });
  rounded(terrace, [0.72, 0.12, 0.72], 0x8e897d, [2.1, 0.32, -6.5], 0.16, { material: stone, zone: "terrace" });
  const terraceEmitter = rounded(terrace, [0.38, 0.62, 0.38], 0xd5a66d, [2.1, 0.75, -6.5], 0.08, { material: new THREE.MeshStandardMaterial({ color: 0xcba876, emissive: 0xf1a45d, emissiveIntensity: 0.65, roughness: 0.8 }), zone: "terrace" });
  rounded(terrace, [0.62, 0.08, 0.62], 0x493128, [2.1, 1.08, -6.5], 0.04, { material: walnut, zone: "terrace" });
  const terraceLight = new THREE.PointLight(0xffae68, 22, 4.5, 2);
  terraceLight.position.set(2.1, 0.95, -6.5);
  world.add(terraceLight);
  registerLight(LIGHT_SPECS[5], terraceLight, terraceEmitter);
  tagZone(terrace, "terrace");

  // Stable visual anchors make every zone clickable and inspectable.
  // The threshold glow belongs to the foyer route so the visible front door
  // remains the largest click target in the courtyard view.
  addBeacon(world, "foyer", [0, 2.2, 5.0]);
  addBeacon(world, "living", [-4.2, 2.35, 0.25]);
  addBeacon(world, "study", [4.25, 2.55, 0.1]);
  addBeacon(world, "gallery", [0, 2.55, -3.25]);
  addBeacon(world, "terrace", [0, 2.05, -6.55]);

  // Global ambience is documented separately from local emitter-bound lights.
  scene.add(new THREE.HemisphereLight(0x7586aa, 0x354533, 1.25));
  const moon = new THREE.DirectionalLight(0x9aa6c7, 2.2);
  moon.position.set(-4, 9, 8);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -13;
  moon.shadow.camera.right = 13;
  moon.shadow.camera.top = 13;
  moon.shadow.camera.bottom = -13;
  moon.shadow.bias = -0.0015;
  scene.add(moon);

  const dustPositions = new Float32Array(120 * 3);
  for (let index = 0; index < 120; index += 1) {
    dustPositions[index * 3] = -7 + Math.random() * 14;
    dustPositions[index * 3 + 1] = 0.5 + Math.random() * 4.5;
    dustPositions[index * 3 + 2] = -7.5 + Math.random() * 18;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xffd7a4, size: 0.02, transparent: true, opacity: 0.35, depthWrite: false }));
  world.add(dust);

  if (lights.size !== LIGHT_SPECS.length) throw new Error("Motivated light inventory is incomplete");
}

function findZone(object) {
  let current = object;
  while (current) {
    if (current.userData?.zone && ZONES[current.userData.zone]) return current.userData.zone;
    current = current.parent;
  }
  return null;
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function raycastZone(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...clickables, ...beacons.values()], true)[0];
  return hit ? findZone(hit.object) : null;
}

function bindEvents() {
  roomButtons.forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.room;
    if (id === "foyer" && currentZone === "courtyard") startEntrance();
    else selectZone(id);
  }));
  mapButtons.forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.mapZone)));
  fallbackButtons.forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.fallbackRoom, { immediate: true })));
  enterButton.addEventListener("click", () => {
    if (currentZone === "courtyard") startEntrance();
    else selectZone(ZONES[currentZone].next);
  });
  tourButton.addEventListener("click", startTour);
  panelClose.addEventListener("click", () => {
    selectZone("courtyard");
    enterButton.focus();
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      selectZone("courtyard");
      enterButton.focus();
    }
  });
  addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    selectZone(ZONES[id] ? id : "courtyard", { updateHistory: false });
  });
  canvas.addEventListener("pointermove", (event) => {
    canvas.style.cursor = raycastZone(event) ? "pointer" : "grab";
  });
  canvas.addEventListener("pointerleave", () => { canvas.style.cursor = "grab"; });
  canvas.addEventListener("click", (event) => {
    const id = raycastZone(event);
    if (id) {
      if (id === "foyer" && currentZone === "courtyard") startEntrance();
      else selectZone(id);
    }
  });
  controls.addEventListener("start", () => {
    cameraAnimating = false;
    stopTour();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(animationFrame);
    else {
      clock.getDelta();
      animate();
    }
  });
  addEventListener("resize", resize);
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.4 : 1.8));
  camera.aspect = width / height;
  camera.fov = innerWidth < 760 ? 51 : 44;
  camera.updateProjectionMatrix();
  if (!entrance.active) setCameraDestination(currentZone, true);
}

function updateEntrance(now) {
  if (!entrance.active) return;
  const raw = Math.min(1, (now - entrance.start) / entrance.duration);
  const eased = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
  camera.position.copy(entrance.cameraCurve.getPoint(eased));
  controls.target.copy(entrance.targetCurve.getPoint(eased));
  if (raw >= 1) {
    entrance.active = false;
    controls.enabled = true;
    selectZone("foyer", { fromDirector: entrance.fromTour, immediate: true });
  }
}

function updateTour(now) {
  if (!tour.active) return;
  const elapsed = now - tour.start;
  let targetStep = 0;
  for (let index = 0; index < tour.schedule.length; index += 1) {
    if (elapsed >= tour.schedule[index].at) targetStep = index;
  }
  if (targetStep === tour.step) return;
  tour.step = targetStep;
  const event = tour.schedule[targetStep];
  if (event.type === "zone") selectZone(event.zone, { fromDirector: true, immediate: targetStep === 0 });
  if (event.type === "entrance") startEntrance({ fromTour: true });
  if (event.type === "finish") {
    selectZone(event.zone, { fromDirector: true });
    stopTour({ cancelEntrance: false });
  }
}

function animate(now = performance.now()) {
  if (document.hidden) return;
  animationFrame = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);
  const time = now * 0.001;
  updateTour(now);
  updateEntrance(now);

  if (cameraAnimating && !entrance.active) {
    const alpha = 1 - Math.pow(0.0013, delta);
    camera.position.lerp(cameraDestination, alpha);
    controls.target.lerp(targetDestination, alpha);
    if (camera.position.distanceTo(cameraDestination) < 0.025 && controls.target.distanceTo(targetDestination) < 0.018) cameraAnimating = false;
  }

  doorProgress = THREE.MathUtils.damp(doorProgress, doorTarget, reducedMotion ? 1000 : 3.5, delta);
  if (doorPivot) doorPivot.rotation.y = -doorProgress * 1.22;
  lights.forEach(({ spec, light }) => {
    const target = spec.intensity * (currentZone === spec.zone ? 1 : spec.min);
    light.intensity = THREE.MathUtils.damp(light.intensity, target, 4, delta);
  });
  beacons.forEach((beacon, id) => {
    const selected = id === currentZone;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 2 + ZONES[id].index) * 0.12;
    const size = (selected ? 0.95 : 0.7) * pulse;
    beacon.scale.setScalar(size);
  });
  if (water && !reducedMotion) {
    water.material.opacity = 0.84 + Math.sin(time * 1.2) * 0.04;
    water.rotation.z = Math.sin(time * 0.18) * 0.018;
  }
  if (leaves && !reducedMotion) leaves.rotation.z = Math.sin(time * 0.42) * 0.025;
  if (dust && !reducedMotion) {
    dust.rotation.y = time * 0.005;
    dust.position.y = Math.sin(time * 0.21) * 0.06;
  }
  controls.update();
  renderer.render(scene, camera);
}

function showFallback(error) {
  console.warn("Memory House journey fallback", error || "forced fallback");
  body.dataset.sceneState = "fallback";
  sceneStatus.textContent = "三维层不可用 · DOM 房间路线保持可用";
  updateZoneUi(currentZone);
}

function initFallback() {
  showFallback("query override");
  enterButton.disabled = true;
  setText("#enter-label", "三维入户不可用");
  setText("#enter-note", "文字路线可用");
  tourButton.disabled = true;
  tourButton.querySelector("strong").textContent = "三维导览不可用";
  roomButtons.forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.room, { immediate: true })));
  mapButtons.forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.mapZone, { immediate: true })));
  fallbackButtons.forEach((button) => button.addEventListener("click", () => selectZone(button.dataset.fallbackRoom, { immediate: true })));
  panelClose.addEventListener("click", () => selectZone("courtyard", { immediate: true }));
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      selectZone("courtyard", { immediate: true });
      enterButton.focus();
    }
  });
}

function init() {
  validateLevelData();
  if (new URLSearchParams(location.search).get("webgl") === "off") {
    initFallback();
    return;
  }
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x222932, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222932);
  scene.fog = new THREE.FogExp2(0x252c33, 0.017);
  camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
  cameraDestination = new THREE.Vector3();
  targetDestination = new THREE.Vector3();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 2.8;
  controls.maxDistance = 18;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.43;

  buildWorld();
  bindEvents();
  resize();
  const initial = ZONES[location.hash.slice(1)] ? location.hash.slice(1) : "courtyard";
  selectZone(initial, { immediate: true, updateHistory: false });
  renderer.render(scene, camera);
  body.dataset.sceneState = "ready";
  animate();
}

try {
  init();
} catch (error) {
  if (renderer) renderer.dispose();
  initFallback();
  console.error(error);
}
