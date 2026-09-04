import * as THREE from "three";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js";

const body = document.body;
const canvas = document.querySelector("#residence-canvas");
const sceneState = document.querySelector("#scene-state");
const tourButton = document.querySelector("#tour-button");
const homeButton = document.querySelector("#home-button");
const panelClose = document.querySelector("#panel-close");
const memoryButtons = [...document.querySelectorAll("[data-memory]")];
const fallbackButtons = [...document.querySelectorAll("[data-fallback-memory]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).get("motion") === "reduce";

if (reducedMotion) body.dataset.motion = "reduced";

const memories = {
  home: {
    index: "00",
    type: "HOME / 全景",
    title: "让物件替人开口",
    description: "这间住宅只放进四类有叙事职责的物件。先看完整空间，再选择一个记忆节点；镜头、灯光与文字会同步靠近。",
    quote: "“温暖不是滤镜，而是生活痕迹之间的关系。”",
    role: "建立人物与生活的整体印象",
    asset: "接入真实住宅布局与授权家具",
    status: "晚灯已亮 · 住宅全景",
    camera: [9.4, 6.25, 10.8],
    target: [0, 1.55, -0.15]
  },
  desk: {
    index: "01",
    type: "DESK / 作品",
    title: "做过的事，留在桌上",
    description: "电脑屏幕不是装饰，它应打开一个真实项目；草图、便签和样机则解释结果背后的取舍。空间先吸引靠近，DOM 再承担完整案例。",
    quote: "“作品不是挂在墙上的奖章，而是仍在生长的日常。”",
    role: "从情绪体验进入可验证的项目证据",
    asset: "替换为真实项目封面、视频与英雄样机",
    status: "聚焦书桌 · 作品记忆",
    camera: [6.7, 3.35, 4.5],
    target: [3.25, 1.45, -1.15]
  },
  gallery: {
    index: "02",
    type: "GALLERY / 关系",
    title: "被珍惜的人，形成家的尺度",
    description: "相框墙适合承载共同经历，而不是完整相册。选择少量照片，给出时间、地点和一句可公开的记忆，空间才会从展示厅变成住宅。",
    quote: "“真正让房子温暖的，从来不是家具本身。”",
    role: "建立人与人之间的情绪可信度",
    asset: "替换为经授权的照片、年份与隐私级别",
    status: "聚焦相框 · 关系记忆",
    camera: [-0.8, 3.35, 4.9],
    target: [-5.45, 2.15, -0.25]
  },
  sound: {
    index: "03",
    type: "SOUND / 声音",
    title: "有些记忆先被听见",
    description: "唱片机可以保存一段旁白、环境声或共同喜欢的音乐。声音应由用户主动开启，并跟随镜头和详情层，而不是成为无法停止的背景。",
    quote: "“针落下的那一刻，房间有了自己的时间。”",
    role: "用声音补足画面无法表达的时间感",
    asset: "替换为自有录音、授权音乐与字幕文本",
    status: "聚焦唱片 · 声音记忆（静音原型）",
    camera: [0.15, 2.6, 5.4],
    target: [-3.7, 0.9, 1.35]
  },
  window: {
    index: "04",
    type: "WINDOW / 未来",
    title: "最后一幕，留给还没发生的事",
    description: "窗外不是贴图背景，而是整段旅程的出口。远景、天气和天色可以映射下一阶段，并在这里放置唯一明确的后续行动。",
    quote: "“家保存来路，窗户提醒我们仍可以出发。”",
    role: "收束过去，并把体验指向下一程",
    asset: "替换为真实城市、理想地点或生成式远景",
    status: "聚焦窗景 · 未来记忆",
    camera: [5.65, 3.75, 2.5],
    target: [2.35, 2.05, -3.45]
  }
};

let renderer;
let scene;
let camera;
let controls;
let room;
let raycaster;
let pointer;
let currentMemory = "home";
let cameraDestination;
let targetDestination;
let cameraAnimating = false;
let hoveredMemory = null;
let recordDisc;
let steam;
let dust;
let animationFrame = 0;
const beacons = new Map();
const clickableRoots = [];
const clock = new THREE.Clock();
const tour = { active: false, start: 0, step: -1, sequence: ["home", "desk", "gallery", "sound", "window", "home"] };

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function applyMemoryText(id) {
  const memory = memories[id];
  setText("#memory-index", memory.index);
  setText("#memory-type", memory.type);
  setText("#memory-title", memory.title);
  setText("#memory-description", memory.description);
  setText("#memory-quote", memory.quote);
  setText("#memory-role", memory.role);
  setText("#memory-asset", memory.asset);
  sceneState.textContent = memory.status;
  memoryButtons.forEach((button) => {
    const active = button.dataset.memory === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  body.dataset.node = id;
}

function scalePoseForViewport(position, target) {
  const next = new THREE.Vector3(...position);
  const look = new THREE.Vector3(...target);
  if (innerWidth < 760) next.sub(look).multiplyScalar(1.32).add(look);
  return { position: next, target: look };
}

function setCameraDestination(id, immediate = false) {
  if (!camera || !controls) return;
  const pose = scalePoseForViewport(memories[id].camera, memories[id].target);
  cameraDestination.copy(pose.position);
  targetDestination.copy(pose.target);
  cameraAnimating = !immediate && !reducedMotion;
  if (!cameraAnimating) {
    camera.position.copy(cameraDestination);
    controls.target.copy(targetDestination);
    controls.update();
  }
}

function selectMemory(id, { fromTour = false, immediate = false, updateHistory = true } = {}) {
  if (!memories[id]) return;
  if (!fromTour) stopTour();
  currentMemory = id;
  applyMemoryText(id);
  setCameraDestination(id, immediate);
  beacons.forEach((beacon, key) => {
    beacon.userData.selected = key === id;
    beacon.material.opacity = key === id ? 0.95 : 0.48;
  });
  if (room) {
    room.traverse((object) => {
      if (object.material?.emissive && object.userData.baseEmissive !== undefined) {
        const isSelected = object.userData.memory === id;
        object.material.emissiveIntensity = isSelected ? object.userData.baseEmissive * 2.2 : object.userData.baseEmissive;
      }
    });
  }
  if (updateHistory) {
    const next = id === "home" ? `${location.pathname}${location.search}` : `#${id}`;
    history.replaceState(null, "", next);
  }
}

function stopTour() {
  if (!tour.active) return;
  tour.active = false;
  tour.step = -1;
  tourButton.classList.remove("is-playing");
  tourButton.querySelector("span").textContent = "▶";
  tourButton.querySelector("strong").textContent = "开始住客导览";
  tourButton.querySelector("small").textContent = "约 24 秒";
}

function startTour() {
  if (tour.active) {
    stopTour();
    return;
  }
  tour.active = true;
  tour.start = performance.now();
  tour.step = -1;
  tourButton.classList.add("is-playing");
  tourButton.querySelector("span").textContent = "Ⅱ";
  tourButton.querySelector("strong").textContent = "暂停住客导览";
  tourButton.querySelector("small").textContent = "正在播放";
}

function makeMaterial(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geometry, material, position, rotation = [0, 0, 0], options = {}) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = options.castShadow ?? true;
  object.receiveShadow = options.receiveShadow ?? true;
  if (options.memory) object.userData.memory = options.memory;
  if (material.emissive) object.userData.baseEmissive = material.emissiveIntensity;
  parent.add(object);
  return object;
}

function rounded(parent, size, color, position, radius = 0.08, options = {}) {
  return addMesh(
    parent,
    new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, ...size.map((value) => value / 2))),
    options.material || makeMaterial(color, options.roughness ?? 0.76, options.metalness ?? 0),
    position,
    options.rotation || [0, 0, 0],
    options
  );
}

function makeCanvasTexture(width, height, paint) {
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  paint(surface.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function makeWindowTexture() {
  return makeCanvasTexture(768, 640, (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#464d71");
    gradient.addColorStop(0.55, "#7a6c7a");
    gradient.addColorStop(0.72, "#d09373");
    gradient.addColorStop(1, "#393540");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255, 226, 178, .56)";
    [[70, 500], [140, 465], [255, 520], [342, 455], [456, 490], [560, 448], [650, 512], [720, 470]].forEach(([x, y], index) => {
      context.fillRect(x, y, 26 + (index % 3) * 12, height - y);
      context.fillStyle = index % 2 ? "rgba(246, 198, 139, .62)" : "rgba(255, 231, 181, .43)";
      context.fillRect(x + 8, y + 18, 3, 3);
      context.fillRect(x + 18, y + 38, 3, 3);
      context.fillStyle = "rgba(33, 32, 42, .84)";
    });
    context.fillStyle = "rgba(255,255,255,.4)";
    for (let index = 0; index < 28; index += 1) context.fillRect((index * 89) % width, (index * 47) % 310, 1.5, 1.5);
  });
}

function makeArtworkTexture(variant) {
  return makeCanvasTexture(320, 420, (context, width, height) => {
    const palettes = [
      ["#e8dfd2", "#a15e45", "#273a37"],
      ["#d9cbb6", "#6c7b57", "#c6855b"],
      ["#f0e7d8", "#5b6278", "#b98566"]
    ];
    const palette = palettes[variant % palettes.length];
    context.fillStyle = palette[0];
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette[1];
    context.beginPath();
    context.arc(width * 0.56, height * 0.42, 76 + variant * 8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = palette[2];
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(42, height - 74);
    context.bezierCurveTo(82, 160, 230, 260, width - 38, 80 + variant * 35);
    context.stroke();
    context.fillStyle = palette[2];
    context.fillRect(28, 28, 44, 8);
  });
}

function makeScreenTexture() {
  return makeCanvasTexture(720, 450, (context, width, height) => {
    context.fillStyle = "#171a1a";
    context.fillRect(0, 0, width, height);
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#b96d4d");
    gradient.addColorStop(1, "#283b36");
    context.fillStyle = gradient;
    context.fillRect(34, 34, width - 68, height - 68);
    context.fillStyle = "rgba(255,244,224,.86)";
    context.font = "700 22px monospace";
    context.fillText("PROJECT ARCHIVE / 01", 62, 78);
    context.font = "500 13px sans-serif";
    context.fillStyle = "rgba(255,244,224,.62)";
    context.fillText("PROTOTYPE CONTENT SLOT", 62, 110);
    context.fillStyle = "rgba(245,209,159,.92)";
    context.fillRect(62, 158, 286, 160);
    context.fillStyle = "#24342f";
    context.fillRect(382, 158, 272, 12);
    context.fillRect(382, 190, 205, 9);
    context.fillRect(382, 219, 238, 9);
    context.fillStyle = "rgba(255,244,224,.65)";
    context.font = "600 15px monospace";
    context.fillText("REPLACE WITH TRUE WORK", 382, 283);
  });
}

function tagMemory(root, id) {
  root.userData.memory = id;
  root.traverse((child) => {
    child.userData.memory = id;
  });
  clickableRoots.push(root);
}

function addBeacon(parent, id, position) {
  const texture = makeCanvasTexture(128, 128, (context, width, height) => {
    const gradient = context.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.12, "rgba(255,218,168,.95)");
    gradient.addColorStop(0.34, "rgba(241,165,111,.5)");
    gradient.addColorStop(1, "rgba(241,165,111,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  });
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.48, toneMapped: false });
  const beacon = new THREE.Sprite(material);
  beacon.position.set(...position);
  beacon.scale.set(0.72, 0.72, 0.72);
  beacon.userData.memory = id;
  parent.add(beacon);
  beacons.set(id, beacon);
  return beacon;
}

function buildRoom() {
  room = new THREE.Group();
  room.name = "Memory Residence";
  scene.add(room);

  const plaster = makeMaterial(0xcab9a3, 0.93);
  const oak = makeMaterial(0x8c5c3e, 0.76);
  const oakLight = makeMaterial(0xb77c54, 0.79);
  const walnut = makeMaterial(0x4b3027, 0.72);
  const linen = makeMaterial(0xc8b69f, 0.98);
  const linenLight = makeMaterial(0xe0d2bd, 1);
  const clay = makeMaterial(0x9d5f48, 0.9);
  const darkMetal = makeMaterial(0x252526, 0.42, 0.18);
  const leaf = makeMaterial(0x53674c, 0.86);

  addMesh(room, new THREE.BoxGeometry(12, 0.16, 8), makeMaterial(0x704a34, 0.82), [0, -0.08, 0], [0, 0, 0], { castShadow: false });
  for (let index = 0; index < 24; index += 1) {
    addMesh(room, new THREE.BoxGeometry(0.486, 0.018, 7.88), makeMaterial(index % 3 === 0 ? 0x8c5c3e : index % 3 === 1 ? 0x7b5038 : 0x936142, 0.85), [-5.75 + index * 0.5, 0.015, 0], [0, 0, 0], { castShadow: false });
  }
  addMesh(room, new THREE.BoxGeometry(12, 5.4, 0.2), plaster, [0, 2.7, -3.88], [0, 0, 0], { castShadow: false });
  addMesh(room, new THREE.BoxGeometry(0.2, 5.4, 8), makeMaterial(0xb7a58f, 0.94), [-6, 2.7, 0], [0, 0, 0], { castShadow: false });

  // Dusk window and curtains.
  const windowMaterial = new THREE.MeshBasicMaterial({ map: makeWindowTexture(), toneMapped: false });
  addMesh(room, new THREE.PlaneGeometry(3.45, 3.05), windowMaterial, [2.2, 2.65, -3.75], [0, 0, 0], { castShadow: false, receiveShadow: false, memory: "window" });
  [[0.46, 2.65, -3.67], [3.94, 2.65, -3.67]].forEach((position) => rounded(room, [0.12, 3.2, 0.14], 0x52382a, position, 0.02, { material: walnut, memory: "window" }));
  rounded(room, [3.7, 0.12, 0.14], 0x52382a, [2.2, 4.22, -3.67], 0.02, { material: walnut, memory: "window" });
  rounded(room, [3.7, 0.12, 0.14], 0x52382a, [2.2, 1.08, -3.67], 0.02, { material: walnut, memory: "window" });
  rounded(room, [0.1, 3.0, 0.1], 0x52382a, [2.2, 2.65, -3.64], 0.02, { material: walnut, memory: "window" });
  rounded(room, [1.05, 3.55, 0.14], 0xb79f84, [0.02, 2.5, -3.51], 0.06, { material: linenLight, rotation: [0, 0.08, 0], memory: "window" });
  rounded(room, [0.9, 3.55, 0.14], 0xb79f84, [4.36, 2.5, -3.51], 0.06, { material: linenLight, rotation: [0, -0.08, 0], memory: "window" });

  // Rug, sofa and coffee table create the calm central anchor.
  rounded(room, [5.0, 0.055, 3.15], 0xb29979, [-0.5, 0.055, 0.85], 0.18, { material: makeMaterial(0xb9a387, 1), castShadow: false });
  const sofa = new THREE.Group();
  sofa.position.set(-0.55, 0, -0.2);
  room.add(sofa);
  rounded(sofa, [3.8, 0.46, 1.35], 0xd3c2aa, [0, 0.48, 0.15], 0.18, { material: linen });
  rounded(sofa, [3.8, 1.2, 0.35], 0xc6b298, [0, 1.05, -0.48], 0.14, { material: linen });
  [-1.23, 0, 1.23].forEach((x, index) => rounded(sofa, [1.1, 0.58, 0.44], index === 1 ? 0xb77252 : 0xd9c9b1, [x, 1.08, -0.2], 0.14, { material: index === 1 ? clay : linenLight, rotation: [0.05, 0, index === 1 ? -0.08 : 0.03] }));
  [-1.7, 1.7].forEach((x) => rounded(sofa, [0.28, 0.36, 1.18], 0xb79270, [x, 0.7, 0.14], 0.12, { material: oakLight }));
  rounded(room, [2.45, 0.18, 1.15], 0x835538, [-0.55, 0.61, 2.0], 0.3, { material: oakLight });
  [-1.45, 0.36].forEach((x) => addMesh(room, new THREE.CylinderGeometry(0.05, 0.06, 0.52, 12), darkMetal, [x, 0.3, 2.0]));
  addMesh(room, new THREE.CylinderGeometry(0.19, 0.16, 0.14, 24), makeMaterial(0xc1ad91, 0.92), [-0.05, 0.79, 1.9]);
  rounded(room, [0.58, 0.055, 0.4], 0xe7d8c2, [-0.78, 0.73, 1.88], 0.035, { material: linenLight, rotation: [0, -0.2, 0] });

  // Study desk with a living project screen.
  const desk = new THREE.Group();
  desk.position.set(3.75, 0, -0.65);
  room.add(desk);
  rounded(desk, [3.2, 0.18, 1.15], 0x8c5c3e, [0, 1.14, 0], 0.08, { material: oakLight, memory: "desk" });
  [-1.3, 1.3].forEach((x) => rounded(desk, [0.11, 1.1, 0.11], 0x41332a, [x, 0.55, 0], 0.02, { material: walnut, memory: "desk" }));
  rounded(desk, [1.6, 1.02, 0.1], 0x242627, [0.1, 1.92, -0.23], 0.06, { material: darkMetal, memory: "desk" });
  const screenMaterial = new THREE.MeshStandardMaterial({ map: makeScreenTexture(), emissiveMap: makeScreenTexture(), emissive: 0xd27c52, emissiveIntensity: 0.32, roughness: 0.42 });
  addMesh(desk, new THREE.PlaneGeometry(1.38, 0.77), screenMaterial, [0.1, 1.94, -0.17], [0, 0, 0], { castShadow: false, receiveShadow: false, memory: "desk" });
  rounded(desk, [0.09, 0.55, 0.09], 0x242627, [0.1, 1.43, -0.23], 0.02, { material: darkMetal, memory: "desk" });
  rounded(desk, [0.58, 0.06, 0.32], 0x242627, [0.1, 1.18, -0.13], 0.03, { material: darkMetal, memory: "desk" });
  rounded(desk, [0.68, 0.05, 0.25], 0xddd0ba, [-0.78, 1.27, 0.2], 0.025, { material: linenLight, rotation: [0, -0.12, 0], memory: "desk" });
  addMesh(desk, new THREE.CylinderGeometry(0.13, 0.1, 0.24, 20), clay, [1.14, 1.37, 0.16], [0, 0, 0], { memory: "desk" });
  steam = new THREE.Group();
  steam.position.set(4.9, 1.58, -0.5);
  room.add(steam);
  [0, 0.18, 0.35].forEach((y, index) => addMesh(steam, new THREE.SphereGeometry(0.035 + index * 0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf4e6d2, transparent: true, opacity: 0.18 - index * 0.035, depthWrite: false }), [Math.sin(index) * 0.03, y, 0], [0, 0, 0], { castShadow: false, receiveShadow: false }));
  const chair = new THREE.Group();
  chair.position.set(3.7, 0, 1.18);
  chair.rotation.y = 0.18;
  room.add(chair);
  rounded(chair, [1.05, 0.18, 0.95], 0x8c6d57, [0, 0.74, 0], 0.14, { material: makeMaterial(0x8c6d57, 0.96) });
  rounded(chair, [1.05, 1.0, 0.18], 0x8c6d57, [0, 1.2, 0.38], 0.12, { material: makeMaterial(0x8c6d57, 0.96) });
  [-0.42, 0.42].forEach((x) => rounded(chair, [0.08, 0.72, 0.08], 0x41332a, [x, 0.36, 0], 0.025, { material: walnut }));
  tagMemory(desk, "desk");

  // Gallery on the left wall.
  const gallery = new THREE.Group();
  gallery.position.set(-5.82, 2.28, -0.2);
  gallery.rotation.y = Math.PI / 2;
  room.add(gallery);
  const frameSpecs = [
    [-0.92, 0.33, 0.85, 1.08, 0],
    [0.08, 0.6, 0.7, 0.9, 1],
    [0.92, 0.14, 0.88, 1.18, 2],
    [0.05, -0.5, 0.62, 0.72, 0]
  ];
  frameSpecs.forEach(([x, y, width, height, variant]) => {
    rounded(gallery, [width + 0.11, height + 0.11, 0.08], 0x4b3027, [x, y, 0], 0.035, { material: walnut, memory: "gallery" });
    addMesh(gallery, new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: makeArtworkTexture(variant), roughness: 0.85 }), [x, y, 0.048], [0, 0, 0], { memory: "gallery" });
  });
  tagMemory(gallery, "gallery");

  // Sound cabinet and record player.
  const sound = new THREE.Group();
  sound.position.set(-3.75, 0, 1.25);
  room.add(sound);
  rounded(sound, [2.15, 0.88, 0.82], 0x70442f, [0, 0.48, 0], 0.07, { material: walnut, memory: "sound" });
  [-0.82, 0.82].forEach((x) => rounded(sound, [0.08, 0.42, 0.08], 0x252526, [x, 0.16, 0], 0.02, { material: darkMetal, memory: "sound" }));
  rounded(sound, [1.32, 0.12, 0.62], 0x282727, [-0.25, 1.01, 0], 0.05, { material: darkMetal, memory: "sound" });
  recordDisc = addMesh(sound, new THREE.CylinderGeometry(0.25, 0.25, 0.018, 36), makeMaterial(0x19191b, 0.36, 0.08), [-0.28, 1.09, 0], [Math.PI / 2, 0, 0], { memory: "sound" });
  addMesh(sound, new THREE.CylinderGeometry(0.052, 0.052, 0.022, 24), makeMaterial(0xc77d58, 0.55), [-0.28, 1.11, 0], [Math.PI / 2, 0, 0], { memory: "sound" });
  const arm = rounded(sound, [0.04, 0.04, 0.46], 0xd1b18d, [0.28, 1.13, 0.04], 0.015, { material: makeMaterial(0xc9ab87, 0.45, 0.32), rotation: [0, 0.58, 0], memory: "sound" });
  arm.rotation.z = -0.04;
  rounded(sound, [0.42, 0.42, 0.08], 0xc5ad8c, [0.72, 0.52, 0.44], 0.035, { material: makeMaterial(0xc5ad8c, 0.92), memory: "sound" });
  tagMemory(sound, "sound");

  // Shelf, books and small domestic irregularities.
  const shelf = new THREE.Group();
  shelf.position.set(-4.42, 0, -2.77);
  room.add(shelf);
  rounded(shelf, [2.4, 0.12, 0.45], 0x8c5c3e, [0, 2.55, 0], 0.04, { material: oak });
  rounded(shelf, [2.4, 0.12, 0.45], 0x8c5c3e, [0, 1.62, 0], 0.04, { material: oak });
  rounded(shelf, [2.4, 0.12, 0.45], 0x8c5c3e, [0, 0.68, 0], 0.04, { material: oak });
  [-1.12, 1.12].forEach((x) => rounded(shelf, [0.1, 2.62, 0.45], 0x8c5c3e, [x, 1.34, 0], 0.04, { material: oak }));
  const bookColors = [0x6e7354, 0xa9664c, 0xc2a77d, 0x4f5b62, 0x8c5140];
  for (let index = 0; index < 13; index += 1) {
    const level = index < 7 ? 1.0 : 1.94;
    const localIndex = index < 7 ? index : index - 7;
    rounded(shelf, [0.17 + (index % 2) * 0.04, 0.38 + (index % 3) * 0.05, 0.3], bookColors[index % bookColors.length], [-0.88 + localIndex * 0.29, level, 0.02], 0.015, { material: makeMaterial(bookColors[index % bookColors.length], 0.92), rotation: [0, 0, index % 4 === 0 ? 0.08 : 0] });
  }
  addMesh(shelf, new THREE.CylinderGeometry(0.17, 0.21, 0.38, 22), clay, [0.66, 1.87, 0]);

  // Floor lamp with a low warm pool of light.
  const lamp = new THREE.Group();
  lamp.position.set(-2.85, 0, -0.85);
  room.add(lamp);
  addMesh(lamp, new THREE.CylinderGeometry(0.055, 0.065, 2.55, 16), darkMetal, [0, 1.28, 0]);
  addMesh(lamp, new THREE.CylinderGeometry(0.35, 0.44, 0.68, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9b888, emissive: 0xf1a56f, emissiveIntensity: 0.32, roughness: 0.9, side: THREE.DoubleSide }), [0, 2.55, 0]);
  addMesh(lamp, new THREE.CylinderGeometry(0.34, 0.34, 0.045, 28), darkMetal, [0, 0.04, 0]);
  const lampLight = new THREE.PointLight(0xffb56f, 28, 6.5, 2);
  lampLight.position.set(-2.85, 2.48, -0.7);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(512, 512);
  lampLight.shadow.bias = -0.002;
  room.add(lampLight);

  // Plants anchor the room with organic silhouettes.
  function addPlant(position, scale = 1) {
    const plant = new THREE.Group();
    plant.position.set(...position);
    plant.scale.setScalar(scale);
    room.add(plant);
    addMesh(plant, new THREE.CylinderGeometry(0.28, 0.2, 0.55, 18), clay, [0, 0.28, 0]);
    for (let index = 0; index < 9; index += 1) {
      const angle = index * 2.18;
      const height = 0.66 + (index % 4) * 0.24;
      const leafMesh = addMesh(plant, new THREE.SphereGeometry(0.23, 12, 8), leaf, [Math.cos(angle) * 0.27, height, Math.sin(angle) * 0.22], [0.4, angle, 0.15], { castShadow: true });
      leafMesh.scale.set(0.55, 1.55, 0.38);
    }
  }
  addPlant([4.95, 0, 2.25], 1.2);
  addPlant([-5.1, 0, 2.6], 0.72);

  // A small pendant creates a second, higher pool instead of flat ambient light.
  addMesh(room, new THREE.CylinderGeometry(0.025, 0.025, 2.0, 10), darkMetal, [-0.5, 4.8, 1.05], [0, 0, 0], { castShadow: false });
  addMesh(room, new THREE.SphereGeometry(0.48, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), new THREE.MeshStandardMaterial({ color: 0xd6b486, emissive: 0xe8a468, emissiveIntensity: 0.18, roughness: 0.95, side: THREE.DoubleSide }), [-0.5, 3.82, 1.05], [Math.PI, 0, 0]);
  const pendantLight = new THREE.PointLight(0xffc283, 13, 5.2, 2);
  pendantLight.position.set(-0.5, 3.62, 1.05);
  room.add(pendantLight);

  // Window moon fill and overall dusk ambience.
  const hemisphere = new THREE.HemisphereLight(0x8090bc, 0x493326, 1.4);
  scene.add(hemisphere);
  const moon = new THREE.DirectionalLight(0x9aa8d0, 2.4);
  moon.position.set(4.5, 6, -1.5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -8;
  moon.shadow.camera.right = 8;
  moon.shadow.camera.top = 8;
  moon.shadow.camera.bottom = -8;
  moon.shadow.bias = -0.0015;
  scene.add(moon);

  const windowRoot = new THREE.Group();
  windowRoot.position.set(2.2, 2.6, -3.55);
  room.add(windowRoot);
  tagMemory(windowRoot, "window");

  addBeacon(room, "desk", [3.25, 2.62, -0.2]);
  addBeacon(room, "gallery", [-5.48, 3.23, -0.15]);
  addBeacon(room, "sound", [-3.75, 1.72, 1.32]);
  addBeacon(room, "window", [2.2, 3.7, -3.42]);

  const dustPositions = new Float32Array(90 * 3);
  for (let index = 0; index < 90; index += 1) {
    dustPositions[index * 3] = -4.8 + Math.random() * 9.6;
    dustPositions[index * 3 + 1] = 0.55 + Math.random() * 4.0;
    dustPositions[index * 3 + 2] = -3.1 + Math.random() * 6.0;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xffd7a4, size: 0.018, transparent: true, opacity: 0.46, depthWrite: false }));
  room.add(dust);
}

function findMemoryFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.memory && memories[current.userData.memory]) return current.userData.memory;
    current = current.parent;
  }
  return null;
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function raycastMemory(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...clickableRoots, ...beacons.values()], true)[0];
  return hit ? findMemoryFromObject(hit.object) : null;
}

function bindEvents() {
  memoryButtons.forEach((button) => button.addEventListener("click", () => selectMemory(button.dataset.memory)));
  fallbackButtons.forEach((button) => button.addEventListener("click", () => selectMemory(button.dataset.fallbackMemory, { immediate: true })));
  tourButton.addEventListener("click", startTour);
  homeButton.addEventListener("click", () => selectMemory("home"));
  panelClose.addEventListener("click", () => {
    selectMemory("home");
    homeButton.focus();
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      selectMemory("home");
      homeButton.focus();
    }
  });
  addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    selectMemory(memories[id] ? id : "home", { updateHistory: false });
  });
  canvas.addEventListener("pointermove", (event) => {
    hoveredMemory = raycastMemory(event);
    canvas.style.cursor = hoveredMemory ? "pointer" : "grab";
  });
  canvas.addEventListener("pointerleave", () => {
    hoveredMemory = null;
    canvas.style.cursor = "grab";
  });
  canvas.addEventListener("click", (event) => {
    const id = raycastMemory(event);
    if (id) selectMemory(id);
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
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.45 : 1.85));
  camera.aspect = width / height;
  camera.fov = innerWidth < 760 ? 50 : 43;
  camera.updateProjectionMatrix();
  setCameraDestination(currentMemory, true);
}

function updateTour(now) {
  if (!tour.active) return;
  const nextStep = Math.floor((now - tour.start) / 4100);
  if (nextStep >= tour.sequence.length) {
    stopTour();
    selectMemory("home", { fromTour: true });
    return;
  }
  if (nextStep !== tour.step) {
    tour.step = nextStep;
    selectMemory(tour.sequence[nextStep], { fromTour: true });
  }
}

function animate(now = performance.now()) {
  if (document.hidden) return;
  animationFrame = requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);
  const time = now * 0.001;
  updateTour(now);

  if (cameraAnimating) {
    const alpha = 1 - Math.pow(0.0015, delta);
    camera.position.lerp(cameraDestination, alpha);
    controls.target.lerp(targetDestination, alpha);
    if (camera.position.distanceTo(cameraDestination) < 0.025 && controls.target.distanceTo(targetDestination) < 0.018) cameraAnimating = false;
  }

  beacons.forEach((beacon, id) => {
    const active = id === currentMemory;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 2.1 + Number(memories[id].index)) * 0.12;
    const size = (active ? 0.94 : 0.7) * pulse;
    beacon.scale.set(size, size, size);
  });
  if (recordDisc && (currentMemory === "sound" || tour.active)) recordDisc.rotation.y += delta * 1.2;
  if (steam && !reducedMotion) {
    steam.position.y = Math.sin(time * 1.1) * 0.025;
    steam.rotation.y = Math.sin(time * 0.46) * 0.12;
  }
  if (dust && !reducedMotion) {
    dust.rotation.y = time * 0.008;
    dust.position.y = Math.sin(time * 0.18) * 0.08;
  }
  controls.update();
  renderer.render(scene, camera);
}

function showFallback(error) {
  console.warn("Memory Residence WebGL fallback", error || "forced fallback");
  body.dataset.sceneState = "fallback";
  sceneState.textContent = "三维层不可用 · 已切换文字住宅";
  applyMemoryText(currentMemory);
}

function init() {
  if (new URLSearchParams(location.search).get("webgl") === "off") {
    showFallback("query override");
    tourButton.disabled = true;
    tourButton.querySelector("strong").textContent = "三维导览不可用";
    tourButton.querySelector("small").textContent = "文字浏览可用";
    memoryButtons.forEach((button) => button.addEventListener("click", () => selectMemory(button.dataset.memory, { immediate: true })));
    fallbackButtons.forEach((button) => button.addEventListener("click", () => selectMemory(button.dataset.fallbackMemory, { immediate: true })));
    homeButton.addEventListener("click", () => selectMemory("home", { immediate: true }));
    panelClose.addEventListener("click", () => selectMemory("home", { immediate: true }));
    addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        selectMemory("home", { immediate: true });
        homeButton.focus();
      }
    });
    return;
  }

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x2b292f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b292f);
  scene.fog = new THREE.FogExp2(0x3a3332, 0.018);
  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 70);
  cameraDestination = new THREE.Vector3();
  targetDestination = new THREE.Vector3();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 17;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.42;
  controls.minAzimuthAngle = -1.2;
  controls.maxAzimuthAngle = 1.15;

  buildRoom();
  bindEvents();
  resize();
  addEventListener("resize", resize);

  const initialId = memories[location.hash.slice(1)] ? location.hash.slice(1) : "home";
  selectMemory(initialId, { immediate: true, updateHistory: false });
  renderer.render(scene, camera);
  body.dataset.sceneState = "ready";
  sceneState.textContent = memories[initialId].status;
  animate();
}

try {
  init();
} catch (error) {
  showFallback(error);
}
