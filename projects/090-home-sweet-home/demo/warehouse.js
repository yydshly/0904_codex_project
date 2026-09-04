import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.querySelector("#warehouse-canvas");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const stages = [
  {
    code: "INBOUND",
    title: "入库接收",
    description: "到货车辆进入月台，包裹经过扫描与称重后进入统一履约流。",
    task: "校验到货与订单身份",
    proof: "状态同时驱动场景、路径与 KPI",
    metrics: [["到货箱数", "128", "箱"], ["扫描准确率", "99.8", "%"], ["平均等待", "04:12", "min"]],
    surfaces: ["入库月台", "货厢后门 → 扫描台", "卸货门运行", "到货与准确率", "校验订单身份"],
    accent: 0xff8b4d,
    accentCss: "#ff8b4d",
    route: [0.00, 0.26],
    cameraTarget: [-4.8, 0.4, 0.5]
  },
  {
    code: "PUTAWAY",
    title: "智能上架",
    description: "AMR 领取周转箱，根据库位热度和通道负载将货物送入目标货架。",
    task: "分配库位并避开拥堵",
    proof: "设备 Actor 根据同一状态重排",
    metrics: [["在途 AMR", "18", "台"], ["库位利用率", "84.6", "%"], ["任务队列", "032", "项"]],
    surfaces: ["高位存储区", "扫描台 → 目标库位", "AMR 集群运行", "库位与队列", "分配最优货位"],
    accent: 0x53d8d0,
    accentCss: "#53d8d0",
    route: [0.20, 0.51],
    cameraTarget: [-1.9, 0.5, 0.1]
  },
  {
    code: "PICKING",
    title: "波次拣选",
    description: "订单被聚合为拣选波次，货到人工作站与机械臂并行完成分拣。",
    task: "合并路径并校验商品",
    proof: "流向、设备与反馈同步切态",
    metrics: [["进行中波次", "07", "组"], ["拣选效率", "486", "件/h"], ["异常订单", "003", "单"]],
    surfaces: ["拣选工作站", "库位 → 分拣线", "机械臂协同", "效率与异常", "完成波次拣选"],
    accent: 0xffc75b,
    accentCss: "#ffc75b",
    route: [0.45, 0.78],
    cameraTarget: [2.0, 0.5, 0.0]
  },
  {
    code: "DISPATCH",
    title: "集货出库",
    description: "完成复核的包裹按承运商和线路集货，在 SLA 截止前装车离场。",
    task: "按线路合流并完成装车",
    proof: "完成态收敛为统一运营结果",
    metrics: [["已完成订单", "2,408", "单"], ["准时出库率", "98.7", "%"], ["待发车辆", "06", "辆"]],
    surfaces: ["出库月台", "集货区 → 货厢后门", "装车门运行", "订单与准时率", "完成线路交接"],
    accent: 0x76dd9a,
    accentCss: "#76dd9a",
    route: [0.73, 1.00],
    cameraTarget: [5.1, 0.4, -0.2]
  }
];

const ui = {
  number: document.querySelector("#stage-number"),
  code: document.querySelector("#stage-code"),
  title: document.querySelector("#stage-title"),
  description: document.querySelector("#stage-description"),
  task: document.querySelector("#stage-task"),
  proof: document.querySelector("#stage-proof"),
  metricLabels: ["a", "b", "c"].map((key) => document.querySelector(`#metric-${key}-label`)),
  metricValues: ["a", "b", "c"].map((key) => document.querySelector(`#metric-${key}`)),
  metricUnits: ["a", "b", "c"].map((key) => document.querySelector(`#metric-${key}-unit`)),
  surfaces: ["camera", "route", "device", "kpi", "copy"].map((key) => document.querySelector(`#surface-${key}`)),
  buttons: [...document.querySelectorAll("[data-stage]")],
  play: document.querySelector("#play-tour"),
  playIcon: document.querySelector("#play-tour .play-icon"),
  playLabel: document.querySelector("#play-tour b"),
  reset: document.querySelector("#reset-view"),
  progress: document.querySelector("#tour-progress"),
  renderStats: document.querySelector("#render-stats")
};

let renderer;
let scene;
let camera;
let controls;
let clock;
let currentStage = 0;
let cameraTween = null;
let isPlaying = false;
let autoplayStartedAt = 0;
const autoplayDuration = 5200;

const zonePads = [];
const zoneRings = [];
const equipmentMaterials = [[], [], [], []];
const routeLines = [];
const routeArrows = [];
const packages = [];
const amrs = [];
const robotArms = [];
const beaconLights = [];
const textures = {};

const colors = {
  floor: 0x102735,
  edge: 0x254656,
  steel: 0x5d7180,
  darkSteel: 0x223a48,
  cardboard: 0xb87943,
  pale: 0xc8d8d9,
  screen: 0x53d8d0
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.15,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    map: options.map ?? null,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide
  });
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function makeTexture(width, height, painter, repeatX = 1, repeatY = 1) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = width;
  textureCanvas.height = height;
  const context = textureCanvas.getContext("2d");
  painter(context, width, height);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
  return texture;
}

function buildProceduralTextures() {
  const random = seededRandom(907);
  textures.concrete = makeTexture(256, 256, (context, width, height) => {
    context.fillStyle = "#a8b2ae";
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 2500; index += 1) {
      const value = 118 + Math.floor(random() * 62);
      context.fillStyle = `rgba(${value},${value + 4},${value + 2},${0.025 + random() * 0.08})`;
      context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2);
    }
    context.strokeStyle = "rgba(35,52,58,.24)";
    context.lineWidth = 2;
    context.strokeRect(1, 1, width - 2, height - 2);
    context.strokeStyle = "rgba(255,255,255,.08)";
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
  }, 5.4, 3.2);

  textures.cardboard = makeTexture(192, 192, (context, width, height) => {
    context.fillStyle = "#b9834f";
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 180; index += 1) {
      context.strokeStyle = `rgba(74,43,21,${0.03 + random() * 0.08})`;
      context.beginPath();
      const y = random() * height;
      context.moveTo(0, y);
      context.lineTo(width, y + random() * 3);
      context.stroke();
    }
    context.fillStyle = "rgba(238,209,158,.32)";
    context.fillRect(width * 0.46, 0, width * 0.08, height);
    context.fillStyle = "rgba(36,30,24,.58)";
    context.fillRect(width * 0.67, height * 0.15, width * 0.2, height * 0.24);
    context.fillStyle = "rgba(238,225,194,.7)";
    context.fillRect(width * 0.7, height * 0.19, width * 0.14, height * 0.04);
    context.fillRect(width * 0.7, height * 0.27, width * 0.1, height * 0.025);
  }, 1, 1);

  textures.metal = makeTexture(128, 256, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#5e737c");
    gradient.addColorStop(0.5, "#8b9a9d");
    gradient.addColorStop(1, "#536a74");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    for (let x = 0; x < width; x += 8) {
      context.fillStyle = x % 16 === 0 ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.09)";
      context.fillRect(x, 0, 2, height);
    }
  }, 6, 2);

  textures.hazard = makeTexture(160, 40, (context, width, height) => {
    context.fillStyle = "#e9b83f";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#17242a";
    context.lineWidth = 18;
    for (let x = -40; x < width + 40; x += 34) {
      context.beginPath();
      context.moveTo(x, height);
      context.lineTo(x + 40, 0);
      context.stroke();
    }
  }, 4, 1);
}

function box(width, height, depth, meshMaterial, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), meshMaterial);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedBox(width, height, depth, meshMaterial, x = 0, y = 0, z = 0, radius = 0.08, segments = 3) {
  const safeRadius = Math.min(radius, width * 0.22, height * 0.22, depth * 0.22);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, segments, safeRadius), meshMaterial);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radius, height, meshMaterial, x = 0, y = 0, z = 0, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), meshMaterial);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function trackMaterial(stageIndex, color = stages[stageIndex].accent) {
  const meshMaterial = material(color, { emissive: color, emissiveIntensity: 0.12, metalness: 0.35 });
  equipmentMaterials[stageIndex].push(meshMaterial);
  return meshMaterial;
}

function makeLabel(text, color) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 320;
  labelCanvas.height = 72;
  const context = labelCanvas.getContext("2d");
  context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
  context.fillStyle = "rgba(6,19,31,.86)";
  context.fillRect(1, 1, 318, 70);
  context.strokeStyle = `#${new THREE.Color(color).getHexString()}`;
  context.lineWidth = 2;
  context.strokeRect(1, 1, 318, 70);
  context.fillStyle = "#eef7f5";
  context.font = "500 27px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 160, 37);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(2.5, 0.56, 1);
  return sprite;
}

function makeWallSign(title, subtitle, accent = 0x53d8d0, width = 4.8) {
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 640;
  signCanvas.height = 160;
  const context = signCanvas.getContext("2d");
  context.fillStyle = "rgba(8,24,34,.96)";
  context.fillRect(0, 0, 640, 160);
  context.fillStyle = `#${new THREE.Color(accent).getHexString()}`;
  context.fillRect(0, 0, 12, 160);
  context.strokeStyle = "rgba(145,190,197,.22)";
  context.lineWidth = 3;
  context.strokeRect(1.5, 1.5, 637, 157);
  context.fillStyle = "#eef7f5";
  context.font = "600 46px Arial";
  context.fillText(title, 48, 72);
  context.fillStyle = "rgba(167,195,200,.78)";
  context.font = "500 21px monospace";
  context.fillText(subtitle, 50, 116);
  const texture = new THREE.CanvasTexture(signCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.25),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  return sign;
}

function addContactShadow(x, z, scaleX, scaleZ, opacity = 0.3) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(x, 0.095, z);
  shadow.scale.set(scaleX, scaleZ, 1);
  scene.add(shadow);
}

function createPallet(x, y, z, rotation = 0) {
  const group = new THREE.Group();
  const wood = material(0x8b603b, { roughness: 0.82, map: textures.cardboard });
  [-0.38, 0, 0.38].forEach((offset) => group.add(box(0.18, 0.12, 1.05, wood, offset, 0.06, 0)));
  [-0.38, 0, 0.38].forEach((offset) => group.add(box(1.02, 0.08, 0.14, wood, 0, 0.15, offset)));
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  return group;
}

function createWarehouseShell() {
  const wallMaterial = material(0x263b45, { metalness: 0.48, roughness: 0.56, map: textures.metal });
  const beamMaterial = material(0x344d59, { metalness: 0.72, roughness: 0.36 });
  const glassMaterial = material(0x315d6c, { emissive: 0x174a5a, emissiveIntensity: 0.45, metalness: 0.18, roughness: 0.18, transparent: true, opacity: 0.68 });
  const lampMaterial = material(0xdffcff, { emissive: 0x8be9f1, emissiveIntensity: 2.4, roughness: 0.2 });

  const backWall = box(20.2, 5.8, 0.22, wallMaterial, 0, 2.82, -5.42);
  backWall.receiveShadow = true;
  scene.add(backWall);

  [-8.7, -5.8, -2.9, 0, 2.9, 5.8, 8.7].forEach((x) => {
    scene.add(box(0.18, 5.95, 0.34, beamMaterial, x, 2.9, -5.18));
  });
  [1.25, 3.05, 4.92].forEach((y) => {
    scene.add(box(20, 0.12, 0.3, beamMaterial, 0, y, -5.18));
  });

  [-6.9, -2.3, 2.3, 6.9].forEach((x) => {
    const windowPanel = box(3.55, 1.18, 0.08, glassMaterial, x, 3.76, -5.02);
    windowPanel.castShadow = false;
    scene.add(windowPanel);
    scene.add(box(0.055, 1.2, 0.1, beamMaterial, x, 3.76, -4.97));
  });

  [-7.3, -2.5, 2.5, 7.3].forEach((x) => {
    scene.add(box(4.4, 0.13, 0.18, beamMaterial, x, 5.55, -1.6));
    scene.add(box(0.16, 0.16, 7.15, beamMaterial, x, 5.42, -1.65));
    const lamp = roundedBox(1.35, 0.08, 0.34, lampMaterial, x, 5.14, -0.25, 0.04, 2);
    lamp.castShadow = false;
    scene.add(lamp);
    const light = new THREE.PointLight(0xbfeff1, 2.7, 8.5, 2.1);
    light.position.set(x, 4.88, -0.25);
    scene.add(light);
  });

  const brandSign = makeWallSign("FLOWDECK  WH—07", "LIVE FULFILMENT ORCHESTRATION", 0x53d8d0, 5.2);
  brandSign.position.set(-5.9, 4.82, -4.98);
  scene.add(brandSign);
  const safetySign = makeWallSign("SAFETY FIRST", "AUTOMATED ZONE · KEEP CLEAR", 0xffc75b, 3.4);
  safetySign.position.set(6.7, 4.82, -4.98);
  scene.add(safetySign);
}

function createFloorMarkings() {
  const white = material(0xd8e4df, { emissive: 0x8da8a5, emissiveIntensity: 0.14, roughness: 0.72 });
  const safety = material(0xffffff, { map: textures.hazard, roughness: 0.75 });
  [-3.2, 0, 3.2].forEach((x) => scene.add(box(0.035, 0.018, 10.1, white, x, 0.105, 0)));
  [-6.25, 6.25].forEach((x) => {
    scene.add(box(2.55, 0.025, 0.42, safety, x, 0.12, 2.75));
    scene.add(box(2.55, 0.025, 0.42, safety, x, 0.12, -2.75));
  });
  for (let index = 0; index < 8; index += 1) {
    scene.add(box(0.08, 0.022, 0.85, white, -0.25 + index * 0.72, 0.12, 3.95));
  }
}

function createZone(index, x, label) {
  const color = stages[index].accent;
  const padMaterial = material(0x78908e, { emissive: color, emissiveIntensity: 0.06, metalness: 0.08, roughness: 0.82, map: textures.concrete });
  const pad = box(3.55, 0.08, 7.6, padMaterial, x, 0.03, 0);
  scene.add(pad);
  zonePads.push(padMaterial);

  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.31, 48), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.1, 0);
  scene.add(ring);
  zoneRings.push(ring);

  const sprite = makeLabel(`${String(index + 1).padStart(2, "0")}  ${label}`, color);
  sprite.position.set(x, 3.55, -3.55);
  scene.add(sprite);
}

function createDock(x, z, stageIndex, side) {
  const group = new THREE.Group();
  const steel = material(colors.darkSteel, { metalness: 0.62, roughness: 0.4, map: textures.metal });
  const active = trackMaterial(stageIndex);
  const rubber = material(0x111a20, { roughness: 0.92 });
  const hazard = material(0xffffff, { map: textures.hazard, roughness: 0.68 });
  const dockPlate = roundedBox(2.3, 0.19, 1.28, steel, 0, 0.18, 0, 0.07);
  group.add(dockPlate);
  group.add(box(0.28, 2.3, 0.3, rubber, -1.04, 1.33, -0.48));
  group.add(box(0.28, 2.3, 0.3, rubber, 1.04, 1.33, -0.48));
  group.add(box(2.36, 0.28, 0.3, rubber, 0, 2.43, -0.48));
  group.add(box(0.14, 2.18, 0.18, steel, -0.98, 1.32, -0.66));
  group.add(box(0.14, 2.18, 0.18, steel, 0.98, 1.32, -0.66));
  group.add(box(2.12, 0.14, 0.18, active, 0, 2.36, -0.66));
  group.add(box(1.74, 0.08, 0.08, active, 0, 1.86, -0.74));
  group.add(box(0.24, 0.72, 0.28, rubber, -0.86, 0.62, 0.28));
  group.add(box(0.24, 0.72, 0.28, rubber, 0.86, 0.62, 0.28));
  [-0.75, -0.25, 0.25, 0.75].forEach((offset) => group.add(box(0.09, 0.025, 1.02, hazard, offset, 0.3, 0.06)));
  const sensor = roundedBox(0.34, 0.21, 0.12, active, 0, 2.08, -0.76, 0.04);
  group.add(sensor);
  const shelter = roundedBox(2.64, 0.12, 1.02, steel, 0, 2.72, -0.18, 0.04);
  shelter.rotation.x = -0.08;
  group.add(shelter);
  group.position.set(x, 0, z);
  group.rotation.y = side === "left" ? Math.PI / 2 : -Math.PI / 2;
  scene.add(group);
  return group;
}

function createTruck(x, z, rotation, stageIndex, operation) {
  const group = new THREE.Group();
  const body = material(0xdbe2df, { metalness: 0.3, roughness: 0.34, map: textures.metal });
  const dark = material(0x111b22, { metalness: 0.25, roughness: 0.82 });
  const glass = material(0x183847, { emissive: 0x153d4d, emissiveIntensity: 0.48, metalness: 0.25, roughness: 0.12 });
  const chrome = material(0x8fa3a8, { metalness: 0.92, roughness: 0.18 });
  const lamp = material(0xe7f9d0, { emissive: 0xc8ff9e, emissiveIntensity: 2.2, roughness: 0.18 });
  const tailLamp = material(0xc94132, { emissive: 0xff493a, emissiveIntensity: 1.8, roughness: 0.25 });
  const cardboard = material(0xb87943, { map: textures.cardboard, roughness: 0.82 });
  const hazard = material(0xffffff, { map: textures.hazard, roughness: 0.68 });
  const active = trackMaterial(stageIndex);

  // Local +X is the cab/front. The cargo body is assembled from panels so the
  // local -X rear stays visibly open and can connect to the loading dock.
  group.add(box(2.35, 0.12, 1.24, dark, -0.38, 0.41, 0));
  group.add(box(2.35, 0.12, 1.36, body, -0.38, 1.78, 0));
  group.add(box(2.35, 1.37, 0.09, body, -0.38, 1.1, -0.635));
  group.add(box(2.35, 1.37, 0.09, body, -0.38, 1.1, 0.635));
  group.add(box(0.1, 1.48, 1.36, body, 0.8, 1.08, 0));
  group.add(createPallet(-0.68, 0.43, 0, Math.PI / 2));
  group.add(roundedBox(0.52, 0.48, 0.45, cardboard, -0.87, 0.82, -0.27, 0.035, 2));
  group.add(roundedBox(0.46, 0.4, 0.42, cardboard, -0.35, 0.78, 0.25, 0.035, 2));
  group.add(roundedBox(1.02, 1.25, 1.25, active, 1.32, 0.94, 0, 0.15));
  group.add(box(0.66, 0.38, 1.05, glass, 1.56, 1.27, 0));
  group.add(box(0.08, 0.38, 1.08, active, 1.2, 1.27, 0));
  group.add(box(0.16, 0.38, 1.3, chrome, 1.84, 0.62, 0));
  group.add(box(0.08, 0.2, 0.72, dark, 1.94, 0.79, 0));
  group.add(box(0.07, 0.16, 0.2, lamp, 1.94, 0.69, -0.39));
  group.add(box(0.07, 0.16, 0.2, lamp, 1.94, 0.69, 0.39));
  [-1.25, -0.75, -0.25, 0.25, 0.75].forEach((ribX) => {
    group.add(box(0.035, 1.28, 0.045, chrome, ribX, 1.08, -0.69));
    group.add(box(0.035, 1.28, 0.045, chrome, ribX, 1.08, 0.69));
  });
  [[-0.95, -0.59], [-0.95, 0.59], [1.28, -0.59], [1.28, 0.59]].forEach(([wheelX, wheelZ]) => {
    const wheel = cylinder(0.27, 0.18, dark, wheelX, 0.33, wheelZ, 18);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
    const hub = cylinder(0.12, 0.195, chrome, wheelX, 0.33, wheelZ, 16);
    hub.rotation.x = Math.PI / 2;
    group.add(hub);
  });
  const mirrorLeft = box(0.18, 0.09, 0.05, dark, 1.55, 1.33, -0.75);
  const mirrorRight = mirrorLeft.clone();
  mirrorRight.position.z = 0.75;
  group.add(mirrorLeft, mirrorRight);
  group.add(box(0.09, 1.42, 0.1, chrome, -1.59, 1.08, -0.62));
  group.add(box(0.09, 1.42, 0.1, chrome, -1.59, 1.08, 0.62));
  group.add(box(0.09, 0.1, 1.34, chrome, -1.59, 1.76, 0));
  group.add(box(0.18, 0.2, 1.42, dark, -1.68, 0.34, 0));
  group.add(box(0.07, 0.16, 0.18, tailLamp, -1.7, 0.58, -0.48));
  group.add(box(0.07, 0.16, 0.18, tailLamp, -1.7, 0.58, 0.48));
  const liftGate = box(0.52, 0.07, 1.16, hazard, -1.86, 0.31, 0);
  liftGate.rotation.z = -0.08;
  group.add(liftGate);
  group.add(box(0.12, 0.22, 1.16, active, -1.57, 1.62, 0));
  const rearLabel = makeLabel(operation === "unload" ? "REAR · UNLOAD" : "REAR · LOAD", stages[stageIndex].accent);
  rearLabel.scale.set(1.42, 0.32, 1);
  rearLabel.position.set(-1.63, 2.14, 0);
  group.add(rearLabel);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);
  addContactShadow(x, z, 1.9, 0.85, 0.38);
  return group;
}

function createRack(x, z, stageIndex) {
  const group = new THREE.Group();
  const frame = material(colors.steel, { metalness: 0.68, roughness: 0.36, map: textures.metal });
  const shelf = trackMaterial(stageIndex, 0x467b8a);
  const labelMaterial = material(0xe8f2ef, { emissive: 0xaadad6, emissiveIntensity: 0.22, roughness: 0.35 });
  const parcelColors = [0xb87943, 0xc49357, 0x8e633f, 0xd0a368, 0x9d7651];
  [-0.9, 0.9].forEach((px) => [-0.45, 0.45].forEach((pz) => group.add(box(0.1, 2.9, 0.1, frame, px, 1.5, pz))));
  [0.4, 1.25, 2.1].forEach((y, shelfIndex) => {
    group.add(box(2.05, 0.09, 1.08, shelf, 0, y, 0));
    group.add(createPallet(0, y + 0.07, 0));
    for (let parcelIndex = 0; parcelIndex < 3; parcelIndex += 1) {
      const parcelHeight = 0.38 + (parcelIndex % 2) * 0.14;
      const parcelMaterial = material(parcelColors[(shelfIndex + parcelIndex) % parcelColors.length], { roughness: 0.82, map: textures.cardboard });
      const parcel = roundedBox(0.47, parcelHeight, 0.44, parcelMaterial, -0.6 + parcelIndex * 0.6, y + 0.26 + parcelHeight * 0.5, 0, 0.035, 2);
      group.add(parcel);
    }
    group.add(box(0.3, 0.11, 0.03, labelMaterial, 0.68, y + 0.1, 0.57));
  });
  const braceA = box(0.07, 2.58, 0.07, frame, 0, 1.56, -0.5);
  braceA.rotation.z = 0.59;
  const braceB = braceA.clone();
  braceB.rotation.z = -0.59;
  group.add(braceA, braceB);
  group.add(box(2.18, 0.11, 1.17, frame, 0, 2.95, 0));
  group.position.set(x, 0, z);
  scene.add(group);
  addContactShadow(x, z, 1.2, 0.75, 0.26);
}

function createAmr(x, z) {
  const group = new THREE.Group();
  const baseMaterial = material(0x283f4d, { metalness: 0.62, roughness: 0.33, map: textures.metal });
  const rubber = material(0x10181e, { roughness: 0.94 });
  const glass = material(0x183d4c, { emissive: 0x2b90a0, emissiveIntensity: 0.72, roughness: 0.16 });
  const lightMaterial = trackMaterial(1);
  group.add(cylinder(0.48, 0.23, baseMaterial, 0, 0.23, 0, 32));
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 32), rubber);
  bumper.rotation.x = Math.PI / 2;
  bumper.position.y = 0.23;
  group.add(bumper);
  group.add(roundedBox(0.61, 0.14, 0.61, lightMaterial, 0, 0.43, 0, 0.06));
  group.add(cylinder(0.09, 0.12, glass, 0, 0.58, 0, 18));
  const eye = roundedBox(0.25, 0.08, 0.035, glass, 0, 0.32, 0.47, 0.02);
  group.add(eye);
  [-0.31, 0.31].forEach((wheelX) => {
    const wheel = cylinder(0.12, 0.09, rubber, wheelX, 0.12, 0, 14);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  });
  group.position.set(x, 0, z);
  group.userData.base = new THREE.Vector3(x, 0, z);
  group.traverse((object) => {
    if (object.isMesh) object.castShadow = false;
  });
  scene.add(group);
  amrs.push(group);
}

function createPickStation(x, z) {
  const group = new THREE.Group();
  const base = material(colors.darkSteel, { metalness: 0.68, roughness: 0.34, map: textures.metal });
  const jointMaterial = material(0xd6e2dd, { metalness: 0.58, roughness: 0.25 });
  const rubber = material(0x182329, { roughness: 0.9 });
  const active = trackMaterial(2);
  group.add(roundedBox(1.45, 0.22, 1.18, base, 0, 0.2, 0, 0.08));
  group.add(cylinder(0.29, 0.18, jointMaterial, 0, 0.4, 0, 24));
  group.add(cylinder(0.19, 1.12, active, 0, 0.93, 0, 18));
  const shoulder = new THREE.Group();
  shoulder.position.set(0, 1.48, 0);
  shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), jointMaterial));
  shoulder.add(roundedBox(0.92, 0.19, 0.2, active, 0.42, 0, 0, 0.08));
  const forearm = new THREE.Group();
  forearm.position.set(0.82, 0, 0);
  forearm.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), jointMaterial));
  forearm.add(roundedBox(0.72, 0.15, 0.16, active, 0.32, -0.24, 0, 0.06));
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), jointMaterial);
  wrist.position.set(0.65, -0.47, 0);
  forearm.add(wrist);
  const clawA = box(0.08, 0.28, 0.08, rubber, 0.7, -0.63, -0.1);
  const clawB = clawA.clone();
  clawB.position.z = 0.1;
  forearm.add(clawA, clawB);
  forearm.rotation.z = -0.58;
  shoulder.add(forearm);
  shoulder.traverse((object) => {
    if (object.isMesh) object.castShadow = false;
  });
  group.add(shoulder);
  group.add(createPallet(-0.58, 0.27, 0));
  group.add(roundedBox(0.74, 0.68, 0.54, material(colors.cardboard, { map: textures.cardboard, roughness: 0.82 }), -0.58, 0.72, 0, 0.04));
  group.position.set(x, 0, z);
  scene.add(group);
  addContactShadow(x, z, 1.0, 0.85, 0.3);
  robotArms.push(shoulder);
}

function createBeacon(x, z, stageIndex) {
  const group = new THREE.Group();
  const stem = material(0x415765, { metalness: 0.6 });
  const active = trackMaterial(stageIndex);
  group.add(cylinder(0.055, 1.2, stem, 0, 0.68, 0, 10));
  const bulb = cylinder(0.14, 0.25, active, 0, 1.4, 0, 18);
  group.add(bulb);
  group.position.set(x, 0, z);
  scene.add(group);
  beaconLights.push({ bulb, stageIndex });
}

function createForklift(x, z, rotation = 0) {
  const group = new THREE.Group();
  const active = trackMaterial(1, 0x53d8d0);
  const safety = material(0xf0a33a, { metalness: 0.35, roughness: 0.48 });
  const dark = material(0x16232a, { roughness: 0.88 });
  const steel = material(0x697f87, { metalness: 0.78, roughness: 0.28 });
  const glass = material(0x244d5b, { emissive: 0x235d6a, emissiveIntensity: 0.55, roughness: 0.12 });
  group.add(roundedBox(1.18, 0.46, 0.82, safety, -0.12, 0.42, 0, 0.11));
  group.add(roundedBox(0.55, 0.62, 0.74, safety, -0.42, 0.78, 0, 0.08));
  group.add(box(0.5, 0.45, 0.62, dark, 0.02, 0.81, 0));
  group.add(box(0.08, 1.2, 0.08, steel, -0.55, 1.24, -0.32));
  group.add(box(0.08, 1.2, 0.08, steel, -0.55, 1.24, 0.32));
  group.add(box(0.7, 0.08, 0.76, safety, -0.25, 1.82, 0));
  group.add(box(0.08, 1.66, 0.72, active, 0.65, 1.07, 0));
  group.add(box(0.85, 0.07, 0.08, steel, 1.08, 0.32, -0.26));
  group.add(box(0.85, 0.07, 0.08, steel, 1.08, 0.32, 0.26));
  group.add(box(0.36, 0.34, 0.04, glass, 0.03, 1.28, -0.38));
  [[-0.45, -0.42], [-0.45, 0.42], [0.42, -0.42], [0.42, 0.42]].forEach(([wheelX, wheelZ]) => {
    const wheel = cylinder(0.2, 0.13, dark, wheelX, 0.24, wheelZ, 16);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
  });
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);
  addContactShadow(x, z, 1.0, 0.72, 0.36);
}

function createWarehouseProps() {
  const safety = material(0xf0a33a, { roughness: 0.55 });
  const steel = material(0x5c727b, { metalness: 0.72, roughness: 0.34 });
  const barrelMaterial = material(0x2c6170, { metalness: 0.55, roughness: 0.42, map: textures.metal });
  const parcelMaterial = material(0xb77d49, { roughness: 0.82, map: textures.cardboard });

  [[-7.4, -3.5], [7.4, 3.4]].forEach(([x, z]) => {
    const pallet = createPallet(x, 0.1, z, Math.PI / 2);
    scene.add(pallet);
    const stack = new THREE.Group();
    stack.add(roundedBox(0.72, 0.58, 0.64, parcelMaterial, -0.38, 0.52, 0, 0.04));
    stack.add(roundedBox(0.72, 0.44, 0.64, parcelMaterial, 0.38, 0.45, 0, 0.04));
    stack.add(roundedBox(0.62, 0.48, 0.58, parcelMaterial, 0, 1.03, 0, 0.04));
    stack.position.set(x, 0.1, z);
    stack.rotation.y = Math.PI / 2;
    scene.add(stack);
    addContactShadow(x, z, 0.9, 0.7, 0.25);
  });

  [[-8.7, -3.6], [-8.2, -3.6], [7.8, 3.6]].forEach(([x, z]) => {
    const barrel = cylinder(0.26, 0.72, barrelMaterial, x, 0.46, z, 20);
    scene.add(barrel);
    const bandA = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.022, 7, 20), steel);
    bandA.rotation.x = Math.PI / 2;
    bandA.position.set(x, 0.25, z);
    const bandB = bandA.clone();
    bandB.position.y = 0.66;
    scene.add(bandA, bandB);
  });

  [-7.4, -6.9, 6.9, 7.4].forEach((x) => {
    scene.add(cylinder(0.09, 0.75, safety, x, 0.45, x < 0 ? 3.75 : -3.75, 12));
  });
}

function createConveyorAndFlow() {
  const pathPoints = [
    new THREE.Vector3(-6.72, 0.55, 1.55),
    new THREE.Vector3(-5.85, 0.55, 1.55),
    new THREE.Vector3(-4.1, 0.55, 0.25),
    new THREE.Vector3(-1.9, 0.55, 0.1),
    new THREE.Vector3(0.4, 0.55, 0.05),
    new THREE.Vector3(2.4, 0.55, -0.15),
    new THREE.Vector3(4.3, 0.55, -1.15),
    new THREE.Vector3(7.52, 0.55, -1.15)
  ];
  const curve = new THREE.CatmullRomCurve3(pathPoints, false, "catmullrom", 0.22);
  const baseTube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 140, 0.21, 10, false),
    material(0x172a34, { metalness: 0.72, roughness: 0.34, map: textures.metal })
  );
  baseTube.receiveShadow = true;
  scene.add(baseTube);

  const rollerGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.62, 10);
  const rollerMaterial = material(0x91a5a8, { metalness: 0.86, roughness: 0.2 });
  const rollers = new THREE.InstancedMesh(rollerGeometry, rollerMaterial, 62);
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  for (let rollerIndex = 0; rollerIndex < 62; rollerIndex += 1) {
    const t = rollerIndex / 61;
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    transform.position.copy(position);
    transform.position.y += 0.08;
    transform.quaternion.setFromUnitVectors(up, across);
    transform.updateMatrix();
    rollers.setMatrixAt(rollerIndex, transform.matrix);
  }
  rollers.castShadow = true;
  rollers.receiveShadow = true;
  scene.add(rollers);

  stages.forEach((stage, stageIndex) => {
    const points = [];
    for (let pointIndex = 0; pointIndex <= 36; pointIndex += 1) {
      const t = THREE.MathUtils.lerp(stage.route[0], stage.route[1], pointIndex / 36);
      points.push(curve.getPointAt(t).add(new THREE.Vector3(0, 0.07, 0)));
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color: stage.accent, transparent: true, opacity: stageIndex === 0 ? 0.95 : 0.12 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
    scene.add(line);
    routeLines.push(line);

    const arrowMaterial = new THREE.MeshBasicMaterial({ color: stage.accent, transparent: true, opacity: stageIndex === 0 ? 0.95 : 0.1, depthWrite: false });
    const arrowGeometry = new THREE.ConeGeometry(0.12, 0.32, 3);
    const arrows = new THREE.InstancedMesh(arrowGeometry, arrowMaterial, 5);
    const arrowTransform = new THREE.Object3D();
    for (let arrowIndex = 0; arrowIndex < 5; arrowIndex += 1) {
      const t = THREE.MathUtils.lerp(stage.route[0], stage.route[1], 0.14 + arrowIndex * 0.18);
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      arrowTransform.position.copy(position).add(new THREE.Vector3(0, 0.27, 0));
      arrowTransform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      arrowTransform.updateMatrix();
      arrows.setMatrixAt(arrowIndex, arrowTransform.matrix);
    }
    scene.add(arrows);
    routeArrows.push(arrows);
  });

  for (let packageIndex = 0; packageIndex < 11; packageIndex += 1) {
    const packageMaterial = material(packageIndex % 3 === 0 ? 0xc9955d : 0xb67e49, { map: textures.cardboard, roughness: 0.8, emissive: stages[0].accent, emissiveIntensity: 0.24 });
    const parcel = roundedBox(0.36 + (packageIndex % 2) * 0.05, 0.3 + (packageIndex % 3) * 0.025, 0.34, packageMaterial, 0, 0, 0, 0.035, 2);
    parcel.castShadow = false;
    parcel.userData.offset = packageIndex / 11;
    parcel.userData.material = packageMaterial;
    scene.add(parcel);
    packages.push(parcel);
  }
  return curve;
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b202c);
  scene.fog = new THREE.FogExp2(0x0b202c, 0.019);

  const ambient = new THREE.HemisphereLight(0xcce8e5, 0x0b1720, 1.65);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xe8fbf4, 4.8);
  key.position.set(-4, 14, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -15;
  key.shadow.camera.right = 15;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3cb9c5, 2.2);
  rim.position.set(10, 7, -11);
  scene.add(rim);

  const platform = roundedBox(20, 0.6, 11.5, material(0x091a25, { metalness: 0.4, roughness: 0.48 }), 0, -0.32, 0, 0.13, 4);
  platform.receiveShadow = true;
  scene.add(platform);
  const floor = box(19.1, 0.08, 10.6, material(0x738483, { metalness: 0.08, roughness: 0.88, map: textures.concrete }), 0, 0.01, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(19, 38, 0x335464, 0x203d4b);
  grid.position.y = 0.07;
  grid.scale.z = 0.56;
  grid.material.transparent = true;
  grid.material.opacity = 0.44;
  scene.add(grid);

  createWarehouseShell();
  createFloorMarkings();

  const edgeMaterial = material(colors.edge, { emissive: 0x173e50, emissiveIntensity: 0.25, metalness: 0.5 });
  scene.add(box(20.15, 0.12, 0.12, edgeMaterial, 0, 0.1, -5.72));
  scene.add(box(20.15, 0.12, 0.12, edgeMaterial, 0, 0.1, 5.72));
  scene.add(box(0.12, 0.12, 11.5, edgeMaterial, -10.02, 0.1, 0));
  scene.add(box(0.12, 0.12, 11.5, edgeMaterial, 10.02, 0.1, 0));

  [-4.8, -1.6, 1.6, 4.8].forEach((x, index) => createZone(index, x, ["INBOUND", "STORAGE", "PICKING", "DISPATCH"][index]));

  createDock(-6.15, 1.55, 0, "left");
  createTruck(-8.25, 1.55, Math.PI, 0, "unload");
  createRack(-2.7, -2.1, 1);
  createRack(-1.0, -2.1, 1);
  createRack(-2.7, 2.25, 1);
  createRack(-1.0, 2.25, 1);
  createAmr(-3.7, -0.9);
  createAmr(-1.9, 1.15);
  createAmr(-0.7, -0.8);
  createForklift(-4.15, -2.45, -0.2);
  createPickStation(1.6, 1.75);
  createPickStation(2.7, -1.75);
  createDock(6.2, -1.15, 3, "right");
  createTruck(8.3, -1.15, 0, 3, "load");
  createWarehouseProps();

  [-6.2, -3.2, -0.4, 2.3, 4.8, 6.3].forEach((x, index) => createBeacon(x, index % 2 === 0 ? -3.7 : 3.7, Math.min(3, Math.floor(index / 1.6))));

  return createConveyorAndFlow();
}

function getCameraState(stageIndex) {
  const narrow = window.innerWidth < 821;
  const [x, y, z] = stages[stageIndex].cameraTarget;
  const target = new THREE.Vector3(x, y, z);
  const offset = narrow ? new THREE.Vector3(10.5, 11.8, 16.5) : new THREE.Vector3(10.8, 9.2, 13.8);
  return { target, position: target.clone().add(offset) };
}

function tweenCameraTo(stageIndex, immediate = false) {
  const targetState = getCameraState(stageIndex);
  if (immediate || prefersReducedMotion.matches) {
    camera.position.copy(targetState.position);
    controls.target.copy(targetState.target);
    cameraTween = null;
    return;
  }
  cameraTween = {
    startedAt: performance.now(),
    duration: 1150,
    fromPosition: camera.position.clone(),
    toPosition: targetState.position,
    fromTarget: controls.target.clone(),
    toTarget: targetState.target
  };
}

function updateDom(stageIndex) {
  const stage = stages[stageIndex];
  document.documentElement.style.setProperty("--orange", stage.accentCss);
  ui.number.textContent = `STATE ${String(stageIndex + 1).padStart(2, "0")}`;
  ui.code.textContent = stage.code;
  ui.title.textContent = stage.title;
  ui.description.textContent = stage.description;
  ui.task.textContent = stage.task;
  ui.proof.textContent = stage.proof;
  stage.metrics.forEach(([label, value, unit], index) => {
    ui.metricLabels[index].textContent = label;
    ui.metricValues[index].textContent = value;
    ui.metricUnits[index].textContent = unit;
  });
  stage.surfaces.forEach((value, index) => {
    ui.surfaces[index].textContent = value;
  });
  ui.buttons.forEach((button, index) => {
    const active = index === stageIndex;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function setStage(stageIndex, { source = "manual", immediate = false } = {}) {
  currentStage = (stageIndex + stages.length) % stages.length;
  if (source === "manual" && isPlaying) stopAutoplay();
  updateDom(currentStage);
  if (camera && controls) tweenCameraTo(currentStage, immediate);
}

function startAutoplay() {
  isPlaying = true;
  autoplayStartedAt = performance.now();
  ui.play.setAttribute("aria-pressed", "true");
  ui.play.setAttribute("aria-label", "停止自动演示");
  ui.playIcon.textContent = "Ⅱ";
  ui.playLabel.textContent = "停止演示";
}

function stopAutoplay() {
  isPlaying = false;
  ui.play.setAttribute("aria-pressed", "false");
  ui.play.setAttribute("aria-label", "开始自动演示");
  ui.playIcon.textContent = "▶";
  ui.playLabel.textContent = "自动演示";
  ui.progress.style.width = "0%";
}

function toggleAutoplay() {
  if (isPlaying) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function updateScene(time, flowCurve) {
  const stage = stages[currentStage];
  const [routeStart, routeEnd] = stage.route;

  zonePads.forEach((padMaterial, index) => {
    const target = index === currentStage ? 0.62 : 0.035;
    padMaterial.emissiveIntensity += (target - padMaterial.emissiveIntensity) * 0.055;
  });

  equipmentMaterials.forEach((materials, index) => {
    materials.forEach((meshMaterial) => {
      const target = index === currentStage ? 0.85 : 0.08;
      meshMaterial.emissiveIntensity += (target - meshMaterial.emissiveIntensity) * 0.06;
    });
  });

  zoneRings.forEach((ring, index) => {
    const active = index === currentStage;
    ring.material.opacity += ((active ? 0.46 : 0.045) - ring.material.opacity) * 0.07;
    const pulse = active && !prefersReducedMotion.matches ? 1 + Math.sin(time * 2.4) * 0.09 : 1;
    ring.scale.setScalar(pulse);
  });

  routeLines.forEach((line, index) => {
    line.material.opacity += ((index === currentStage ? 1 : 0.075) - line.material.opacity) * 0.08;
  });

  routeArrows.forEach((arrows, index) => {
    arrows.material.opacity += ((index === currentStage ? 0.96 : 0.06) - arrows.material.opacity) * 0.08;
  });

  packages.forEach((parcel, index) => {
    const travel = (time * 0.11 + parcel.userData.offset) % 1;
    const pathT = THREE.MathUtils.lerp(routeStart, routeEnd, travel);
    const position = flowCurve.getPointAt(pathT);
    const tangent = flowCurve.getTangentAt(pathT);
    parcel.position.copy(position);
    parcel.position.y += 0.31 + Math.sin((time + index) * 3.2) * 0.018;
    parcel.rotation.y = Math.atan2(tangent.x, tangent.z);
    parcel.userData.material.emissive.lerp(new THREE.Color(stage.accent), 0.08);
  });

  amrs.forEach((amr, index) => {
    const activeAmount = currentStage === 1 && !prefersReducedMotion.matches ? 1 : 0;
    amr.position.x = amr.userData.base.x + Math.sin(time * 0.72 + index * 1.7) * 0.62 * activeAmount;
    amr.position.z = amr.userData.base.z + Math.cos(time * 0.64 + index * 1.2) * 0.42 * activeAmount;
    amr.rotation.y = Math.sin(time * 0.58 + index) * 0.5 * activeAmount;
  });

  robotArms.forEach((arm, index) => {
    const activeAmount = currentStage === 2 && !prefersReducedMotion.matches ? 1 : 0;
    arm.rotation.y = Math.sin(time * 1.25 + index * 2.1) * 0.72 * activeAmount;
    arm.rotation.z = Math.sin(time * 1.7 + index) * 0.12 * activeAmount;
  });

  beaconLights.forEach(({ bulb, stageIndex }, index) => {
    const active = stageIndex === currentStage;
    bulb.scale.y = active && !prefersReducedMotion.matches ? 0.85 + Math.sin(time * 5 + index) * 0.18 : 0.85;
  });
}

function updateCamera(now) {
  if (!cameraTween) return;
  const raw = Math.min(1, (now - cameraTween.startedAt) / cameraTween.duration);
  const eased = easeInOutCubic(raw);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  if (raw >= 1) cameraTween = null;
}

function updateAutoplay(now) {
  if (!isPlaying) return;
  const elapsed = now - autoplayStartedAt;
  const progress = Math.min(1, elapsed / autoplayDuration);
  ui.progress.style.width = `${progress * 100}%`;
  if (progress >= 1) {
    autoplayStartedAt = now;
    setStage(currentStage + 1, { source: "autoplay" });
  }
}

function bindControls() {
  ui.buttons.forEach((button) => {
    button.addEventListener("click", () => setStage(Number(button.dataset.stage)));
  });
  ui.play.addEventListener("click", toggleAutoplay);
  ui.reset.addEventListener("click", () => {
    if (camera && controls) tweenCameraTo(currentStage);
  });
  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (["1", "2", "3", "4"].includes(event.key)) {
      setStage(Number(event.key) - 1);
    }
    if (event.code === "Space" && !["BUTTON", "A"].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      toggleAutoplay();
    }
    if (event.key.toLowerCase() === "r") tweenCameraTo(currentStage);
  });
}

function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  buildProceduralTextures();

  camera = new THREE.PerspectiveCamera(37, 1, 0.1, 120);
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 33;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.addEventListener("start", () => { cameraTween = null; });
  clock = new THREE.Clock();

  const flowCurve = createScene();
  const initialCamera = getCameraState(0);
  camera.position.copy(initialCamera.position);
  controls.target.copy(initialCamera.target);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 821 ? 45 : 37;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    document.body.classList.add("webgl-failed");
  });

  document.documentElement.dataset.webglReady = "true";
  setStage(0, { source: "init", immediate: true });
  bindControls();

  let statsStartedAt = performance.now();
  let statsFrames = 0;
  let renderedFrames = 0;

  function animate(now) {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    updateAutoplay(now);
    updateCamera(now);
    updateScene(time, flowCurve);
    controls.update();
    renderer.render(scene, camera);
    renderedFrames += 1;
    if (renderedFrames === 3) renderer.shadowMap.autoUpdate = false;
    statsFrames += 1;
    const statsElapsed = now - statsStartedAt;
    if (statsElapsed >= 1000) {
      const fps = Math.round(statsFrames * 1000 / statsElapsed);
      const triangles = renderer.info.render.triangles;
      const triangleLabel = triangles >= 1000 ? `${(triangles / 1000).toFixed(1)}K` : String(triangles);
      ui.renderStats.textContent = `DRAW ${renderer.info.render.calls} · TRI ${triangleLabel} · TEX ${renderer.info.memory.textures} · FPS ${fps}`;
      statsFrames = 0;
      statsStartedAt = now;
    }
  }
  requestAnimationFrame(animate);
}

if (new URLSearchParams(window.location.search).has("fallback")) {
  document.body.classList.add("webgl-failed");
  updateDom(0);
  bindControls();
} else {
  try {
    init();
  } catch (error) {
    document.body.classList.add("webgl-failed");
    console.error("Warehouse demo initialization failed", error);
  }
}
