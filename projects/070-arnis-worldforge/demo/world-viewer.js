import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const stage = document.querySelector("#world3d-stage");
const canvas = document.querySelector("#world3d-canvas");
const status = document.querySelector("#world3d-status");
const progress = document.querySelector("#world3d-progress");
const motionButton = document.querySelector("#world3d-motion");
const cameraButtons = [...document.querySelectorAll("[data-world-camera]")];
const manifest = window.ARNIS_WORLD_MANIFEST;
const worldPackage = window.ARNIS_WORLD_PACKAGE;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const compactDevice = matchMedia("(max-width: 760px)");
const numberFormatter = new Intl.NumberFormat("zh-CN");

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function hydrateEvidence() {
  if (!manifest) return;
  setText("#world-stat-blocks", numberFormatter.format(manifest.stats.nonAirBlocks));
  setText("#world-stat-chunks", numberFormatter.format(manifest.stats.chunksRead));
  setText("#world-stat-quads", numberFormatter.format(manifest.stats.visibleQuads));
  setText("#world-stat-materials", numberFormatter.format(manifest.stats.materialGroups));
  setText("#world-source-region", manifest.evidence.sourceRegion);
  setText("#world-source-bbox", manifest.bbox);
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function hydrateWorldPackage() {
  if (!worldPackage) return;
  setText("#world-package-files", numberFormatter.format(worldPackage.fileCount));
  setText("#world-package-source-size", formatMiB(worldPackage.worldBytes));
  setText("#world-package-archive-size", formatMiB(worldPackage.archive.byteLength));
  setText("#world-package-button-size", formatMiB(worldPackage.archive.byteLength));
  setText("#world-package-sha", worldPackage.archive.sha256);
  const download = document.querySelector("#world-package-download");
  if (download) {
    download.href = worldPackage.archive.url;
    download.download = worldPackage.archive.fileName;
  }
}

function setStageState(state, title, detail) {
  stage.dataset.worldState = state;
  status.querySelector("b").textContent = title;
  progress.textContent = detail;
}

function quadCorners(face, x, y, z, u, v) {
  switch (face) {
    case 0: return [[x, y, z], [x, y + v, z], [x, y + v, z + u], [x, y, z + u]];
    case 1: return [[x, y, z], [x, y, z + u], [x, y + v, z + u], [x, y + v, z]];
    case 2: return [[x, y, z], [x, y, z + v], [x + u, y, z + v], [x + u, y, z]];
    case 3: return [[x, y, z], [x + u, y, z], [x + u, y, z + v], [x, y, z + v]];
    case 4: return [[x, y, z], [x + u, y, z], [x + u, y + v, z], [x, y + v, z]];
    default: return [[x, y, z], [x, y + v, z], [x + u, y + v, z], [x + u, y, z]];
  }
}

const faceNormals = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const triangleOrder = [0, 1, 2, 0, 2, 3];

function buildMeshes(buffer, scene) {
  const records = new Uint16Array(buffer);
  const stride = manifest.binary.stride;
  const materialLookup = new Map(manifest.materials.map((material) => [material.index, material]));
  const stores = new Map();
  for (const material of manifest.materials) {
    stores.set(material.index, {
      material,
      positions: new Float32Array(material.quadCount * 18),
      normals: new Float32Array(material.quadCount * 18),
      cursor: 0,
    });
  }

  const centerX = manifest.dimensions.width / 2;
  const centerZ = manifest.dimensions.depth / 2;
  let highestY = 0;
  let highestPoint = new THREE.Vector3(0, 0, 0);

  for (let offset = 0; offset < records.length; offset += stride) {
    const face = records[offset];
    const x = records[offset + 1];
    const y = records[offset + 2];
    const z = records[offset + 3];
    const u = records[offset + 4];
    const v = records[offset + 5];
    const materialIndex = records[offset + 6];
    const store = stores.get(materialIndex);
    if (!store || !materialLookup.has(materialIndex)) continue;
    const corners = quadCorners(face, x, y, z, u, v);
    const normal = faceNormals[face];
    for (const cornerIndex of triangleOrder) {
      const corner = corners[cornerIndex];
      store.positions[store.cursor] = corner[0] - centerX;
      store.normals[store.cursor++] = normal[0];
      store.positions[store.cursor] = corner[1];
      store.normals[store.cursor++] = normal[1];
      store.positions[store.cursor] = corner[2] - centerZ;
      store.normals[store.cursor++] = normal[2];
    }
    const quadTop = y + (face === 0 || face === 1 || face === 4 || face === 5 ? v : 0);
    if (quadTop > highestY) {
      highestY = quadTop;
      highestPoint = new THREE.Vector3(x - centerX, quadTop, z - centerZ);
    }
  }

  for (const store of stores.values()) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(store.positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(store.normals, 3));
    geometry.computeBoundingSphere();
    const source = store.material;
    const material = new THREE.MeshLambertMaterial({
      color: source.color,
      side: THREE.DoubleSide,
      transparent: Boolean(source.transparent),
      opacity: source.opacity ?? 1,
      depthWrite: !source.transparent || (source.opacity ?? 1) > 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = source.id === "water" ? 2 : source.transparent ? 1 : 0;
    mesh.userData.materialId = source.id;
    scene.add(mesh);
  }

  return { highestPoint, highestY };
}

function canvasThemeColor() {
  return document.documentElement.dataset.theme === "light" ? 0xdfe7da : 0x091411;
}

async function initWorld() {
  hydrateEvidence();
  if (!manifest) throw new Error("三维导出清单不存在");
  if (new URLSearchParams(location.search).has("world-error")) throw new Error("已启用三维能力回退测试");

  setStageState("loading", "正在读取真实世界区块", "下载 4.2 MiB 可见方块数据…");
  const response = await fetch(manifest.binary.url);
  if (!response.ok) throw new Error(`网格请求失败：HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== manifest.binary.byteLength) throw new Error("网格字节数与证据清单不一致");

  setStageState("loading", "正在构建浏览器网格", "按 21 个方块材质组写入 GPU BufferGeometry…");
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !compactDevice.matches,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, compactDevice.matches ? 1.15 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(canvasThemeColor(), 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(canvasThemeColor(), 410, 900);
  const { highestPoint } = buildMeshes(buffer, scene);

  const width = manifest.dimensions.width;
  const depth = manifest.dimensions.depth;
  const span = Math.max(width, depth);
  const target = new THREE.Vector3(0, Math.min(manifest.dimensions.height * 0.16, 28), 0);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 1800);
  camera.position.set(span * 0.72, span * 0.48, span * 0.72);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = 0.075;
  controls.minDistance = 28;
  controls.maxDistance = 880;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !reducedMotion.matches;
  controls.autoRotateSpeed = 0.34;
  controls.screenSpacePanning = true;
  controls.update();

  const hemisphere = new THREE.HemisphereLight(0xd9eff0, 0x26362d, 2.35);
  const sun = new THREE.DirectionalLight(0xfff2d0, 2.8);
  sun.position.set(-180, 320, 140);
  scene.add(hemisphere, sun);

  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 50, depth + 50),
    new THREE.MeshBasicMaterial({ color: 0x14241d, side: THREE.DoubleSide }),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.7;
  scene.add(base);

  const cameraPresets = {
    home: {
      position: new THREE.Vector3(span * 0.72, span * 0.48, span * 0.72),
      target,
    },
    top: {
      position: new THREE.Vector3(0, span * 1.05, 0.1),
      target: new THREE.Vector3(0, 0, 0),
    },
    landmark: {
      position: highestPoint.clone().add(new THREE.Vector3(92, 74, 92)),
      target: highestPoint.clone().add(new THREE.Vector3(0, -12, 0)),
    },
  };

  let transition = null;
  function moveCamera(position, nextTarget, selectedCamera = "") {
    cameraButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.worldCamera === selectedCamera)));
    controls.autoRotate = false;
    motionButton.setAttribute("aria-pressed", "false");
    if (reducedMotion.matches) {
      camera.position.copy(position);
      controls.target.copy(nextTarget);
      controls.update();
      return;
    }
    transition = {
      started: performance.now(),
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: position.clone(),
      toTarget: nextTarget.clone(),
    };
  }

  function selectCamera(name) {
    const preset = cameraPresets[name];
    if (!preset) return;
    moveCamera(preset.position, preset.target, name);
  }

  cameraButtons.forEach((button) => button.addEventListener("click", () => selectCamera(button.dataset.worldCamera)));
  motionButton.setAttribute("aria-pressed", String(controls.autoRotate));
  motionButton.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    motionButton.setAttribute("aria-pressed", String(controls.autoRotate));
  });
  controls.addEventListener("start", () => {
    transition = null;
    controls.autoRotate = false;
    motionButton.setAttribute("aria-pressed", "false");
  });

  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") {
      selectCamera("home");
      return;
    }
    transition = null;
    controls.autoRotate = false;
    motionButton.setAttribute("aria-pressed", "false");
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === "ArrowLeft") spherical.theta -= 0.12;
    if (event.key === "ArrowRight") spherical.theta += 0.12;
    if (event.key === "ArrowUp") spherical.radius *= 0.88;
    if (event.key === "ArrowDown") spherical.radius *= 1.12;
    spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
  });

  function resize() {
    const rect = stage.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width));
    const nextHeight = Math.max(1, Math.floor(rect.height));
    renderer.setSize(nextWidth, nextHeight, false);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  new MutationObserver(() => {
    const color = canvasThemeColor();
    renderer.setClearColor(color, 1);
    scene.fog.color.setHex(color);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: "150px" }).observe(stage);

  function animate(now) {
    requestAnimationFrame(animate);
    if (!visible && !transition) return;
    if (transition) {
      const raw = Math.min(1, (now - transition.started) / 720);
      const eased = 1 - (1 - raw) ** 3;
      camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      if (raw === 1) transition = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  setStageState("ready", "真实世界已加载", `${numberFormatter.format(manifest.stats.nonAirBlocks)} 个方块 · 可旋转、缩放和切换视角`);
  requestAnimationFrame(animate);
}

hydrateEvidence();
hydrateWorldPackage();
initWorld().catch((error) => {
  console.error("Arnis 3D world viewer:", error);
  setStageState("error", "三维渲染暂不可用", `${error.message}；已切换到同一世界的原生二维预览。`);
  cameraButtons.forEach((button) => { button.disabled = true; });
  motionButton.disabled = true;
});
