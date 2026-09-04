import * as THREE from "three";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#scene");
const fallback = $("#webgl-fallback");
const modeValue = $("#mode-value");
const callsValue = $("#calls-value");
const trianglesValue = $("#triangles-value");
const scoreValue = $("#score-value");
const panelIndex = $("#panel-index");
const panelTitle = $("#panel-title");
const panelDescription = $("#panel-description");
const panelInput = $("#panel-input");
const panelMechanism = $("#panel-mechanism");
const panelValue = $("#panel-value");
const tourButton = $("#tour-button");
const signalButton = $("#signal-button");
const nodeButtons = [...document.querySelectorAll("[data-node]")];
const query = new URLSearchParams(window.location.search);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || query.get("motion") === "reduce";
document.body.dataset.motion = reducedMotion ? "reduced" : "full";

const capabilities = {
  overview: {
    index: "00 / SYSTEM MAP", label: "OVERVIEW",
    title: "能力不是特效清单，\n而是一条体验链路。",
    description: "点击三维节点或下方按钮。镜头、内容层和渲染参数会由同一个状态切换同步驱动。",
    input: "点击、键盘、时间", mechanism: "状态 → 场景 → GPU → DOM", value: "让内容具备空间记忆与参与感",
    camera: [0, 5.7, 12.4], target: [0, 0.7, -1.1], post: 0.14
  },
  spatial: {
    index: "01 / SPATIAL STORY", label: "SPATIAL",
    title: "场景本身，\n就是信息架构。",
    description: "把章节变成空间站点，把选择变成一次有目的的镜头移动；用户会记住位置，也会记住内容关系。",
    input: "节点选择 / 指针拖拽", mechanism: "Raycaster → 状态 → Camera", value: "建立方向感、层级与空间记忆",
    camera: [-6.7, 3.7, 5.5], target: [-3.35, 0.85, -1], post: 0.09
  },
  surface: {
    index: "02 / LIVE SURFACE", label: "SURFACE",
    title: "2D 内容，\n可以成为 3D 材质。",
    description: "站点屏幕由浏览器 Canvas 实时绘制，再上传为 GPU 纹理。仪表盘、游戏画面和动态文字都可进入世界。",
    input: "时间 / 数据 / 2D 绘制", mechanism: "Canvas2D → CanvasTexture", value: "让场景表面承载真实内容",
    camera: [-3.7, 3.3, 2.3], target: [-1.35, 1.15, -3.05], post: 0.12
  },
  physics: {
    index: "03 / INTERACTION LOOP", label: "PHYSICS",
    title: "参与感来自\n可感知的后果。",
    description: "按下发射键，信号球沿弹道运动、留下轨迹并触发命中反馈。小游戏本质是输入、模拟、规则和反馈的闭环。",
    input: "按钮 / Space", mechanism: "Velocity + Gravity + Hit Test", value: "把浏览行为升级为参与行为",
    camera: [5.7, 3.4, 5], target: [1.85, 1.5, -1.8], post: 0.1
  },
  postfx: {
    index: "04 / POST COMPOSITE", label: "POST FX",
    title: "渲染结果，\n还能再次被导演。",
    description: "三维场景先写进离屏 RenderTarget，再由全屏 Shader 统一处理色差、扫描线、噪声与暗角。",
    input: "场景颜色 / 时间 / 强度", mechanism: "Scene → RenderTarget → Shader", value: "形成统一、可调的影像语气",
    camera: [7.1, 3.5, 5.7], target: [3.7, 1, -0.7], post: 0.78
  }
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  fallback.hidden = true;
} catch (error) {
  console.error("WebGL initialization failed", error);
  fallback.style.zIndex = "1";
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b0e);
scene.fog = new THREE.FogExp2(0x080b0e, 0.057);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 80);
const cameraGoal = new THREE.Vector3(...capabilities.overview.camera);
const targetGoal = new THREE.Vector3(...capabilities.overview.target);
const lookTarget = targetGoal.clone();
const cameraDestination = new THREE.Vector3();
const orbitOffset = new THREE.Vector3();
camera.position.copy(cameraGoal);

scene.add(new THREE.HemisphereLight(0xb9ecff, 0x0a0e09, 1.4));
const keyLight = new THREE.DirectionalLight(0xe8fff1, 3.2);
keyLight.position.set(-3, 8, 5);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0xc9ff47, 42, 13, 1.7);
rimLight.position.set(0, 2.4, -1.2);
scene.add(rimLight);

const floor = new THREE.Mesh(new THREE.CircleGeometry(11.5, 96), new THREE.MeshStandardMaterial({ color: 0x0c1112, roughness: 0.72, metalness: 0.2 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.08;
scene.add(floor);
const grid = new THREE.GridHelper(22, 44, 0x47605d, 0x1a2927);
grid.position.y = -0.04;
grid.material.transparent = true;
grid.material.opacity = 0.48;
scene.add(grid);

const lab = new THREE.Group();
scene.add(lab);
const heroCore = new THREE.Group();
heroCore.position.set(0, 1.08, -1.1);
lab.add(heroCore);
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 2), new THREE.MeshPhysicalMaterial({ color: 0xa4c939, emissive: 0x334d08, emissiveIntensity: 1.25, metalness: 0.62, roughness: 0.24, clearcoat: 1 }));
heroCore.add(core);
for (let index = 0; index < 3; index += 1) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 + index * 0.29, 0.025, 10, 80), new THREE.MeshBasicMaterial({ color: index === 1 ? 0x67d7ff : 0xc9ff47, transparent: true, opacity: 0.72 }));
  ring.rotation.set(index * 0.7, index * 1.1, index * 0.35);
  heroCore.add(ring);
}
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.45, 0.42, 24), new THREE.MeshStandardMaterial({ color: 0x18201e, metalness: 0.7, roughness: 0.32 }));
pedestal.position.set(0, 0.16, -1.1);
lab.add(pedestal);

const stationCoordinates = {
  spatial: new THREE.Vector3(-3.35, 0.65, -1), surface: new THREE.Vector3(-1.35, 0.76, -3.05),
  physics: new THREE.Vector3(1.85, 0.7, -1.8), postfx: new THREE.Vector3(3.7, 0.68, -0.7)
};
const stationColors = { spatial: 0xc9ff47, surface: 0x67d7ff, physics: 0xffb56b, postfx: 0xe6a6ff };
const interactiveMeshes = [];
const stations = new Map();

function makeLabelTexture(index, title, color) {
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 640;
  labelCanvas.height = 256;
  const context = labelCanvas.getContext("2d");
  context.fillStyle = "#0b0f11";
  context.fillRect(0, 0, 640, 256);
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.strokeRect(10, 10, 620, 236);
  context.fillStyle = color;
  context.font = "700 32px monospace";
  context.fillText(index, 36, 58);
  context.fillStyle = "#edf1e7";
  context.font = "700 50px sans-serif";
  context.fillText(title, 36, 132);
  context.fillStyle = "#8e9a93";
  context.font = "500 20px monospace";
  context.fillText("CLICK TO INSPECT →", 36, 204);
  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStation(key, index, title) {
  const group = new THREE.Group();
  const color = stationColors[key];
  group.position.copy(stationCoordinates[key]);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.94, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0x17201f, metalness: 0.74, roughness: 0.33 }));
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.42, metalness: 0.42, roughness: 0.2, clearcoat: 1 }));
  beacon.position.y = 0.7;
  base.userData.key = key;
  beacon.userData.key = key;
  interactiveMeshes.push(base, beacon);
  group.add(base, beacon);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.02, 8, 52), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.2;
  group.add(halo);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.68), new THREE.MeshBasicMaterial({ map: makeLabelTexture(index, title, `#${color.toString(16).padStart(6, "0")}`) }));
  label.position.set(0, 1.52, 0);
  group.add(label);
  lab.add(group);
  stations.set(key, { beacon, halo, label });
}

createStation("spatial", "01", "SPATIAL STORY");
createStation("surface", "02", "LIVE SURFACE");
createStation("physics", "03", "INTERACTION");
createStation("postfx", "04", "POST COMPOSITE");

const liveCanvas = document.createElement("canvas");
liveCanvas.width = 768;
liveCanvas.height = 512;
const liveContext = liveCanvas.getContext("2d");
const liveTexture = new THREE.CanvasTexture(liveCanvas);
liveTexture.colorSpace = THREE.SRGBColorSpace;
const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(2.62, 1.79, 0.12), new THREE.MeshStandardMaterial({ color: 0x162021, metalness: 0.78, roughness: 0.3 }));
screenFrame.position.set(-1.35, 2.2, -3.2);
screenFrame.rotation.x = -0.07;
lab.add(screenFrame);
const liveScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.62), new THREE.MeshBasicMaterial({ map: liveTexture }));
liveScreen.position.set(-1.35, 2.2, -3.12);
liveScreen.rotation.x = -0.07;
liveScreen.userData.key = "surface";
liveScreen.renderOrder = 1;
lab.add(liveScreen);
interactiveMeshes.push(liveScreen);

const receiver = new THREE.Group();
receiver.position.set(1.85, 2.02, -1.8);
const receiverRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.075, 14, 64), new THREE.MeshStandardMaterial({ color: 0xffb56b, emissive: 0x7b2e06, emissiveIntensity: 0.6, metalness: 0.62 }));
const receiverDisc = new THREE.Mesh(new THREE.CircleGeometry(0.57, 40), new THREE.MeshBasicMaterial({ color: 0xffb56b, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
receiverDisc.position.z = -0.02;
receiver.add(receiverRing, receiverDisc);
lab.add(receiver);

const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe0b9 }));
orb.visible = false;
scene.add(orb);
const trailLength = 44;
const trailPositions = new Float32Array(trailLength * 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
const trail = new THREE.Points(trailGeometry, new THREE.PointsMaterial({ color: 0xffb56b, size: 0.055, transparent: true, opacity: 0.66, sizeAttenuation: true }));
trail.visible = false;
scene.add(trail);

const archive = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.45, 0.09), new THREE.MeshBasicMaterial({ color: 0x38514d, transparent: true, opacity: 0.5 }), 96);
const archiveMatrix = new THREE.Matrix4();
for (let index = 0; index < archive.count; index += 1) {
  const angle = (index / archive.count) * Math.PI * 2;
  const radius = 7.1 + (index % 4) * 0.24;
  const height = 0.22 + ((index * 17) % 13) * 0.06;
  archiveMatrix.makeTranslation(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius - 1);
  archive.setMatrixAt(index, archiveMatrix);
}
scene.add(archive);

const dustCount = 380;
const dustPositions = new Float32Array(dustCount * 3);
for (let index = 0; index < dustCount; index += 1) {
  dustPositions[index * 3] = (Math.random() - 0.5) * 19;
  dustPositions[index * 3 + 1] = Math.random() * 6.5;
  dustPositions[index * 3 + 2] = (Math.random() - 0.5) * 16 - 1;
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xa8c7b7, size: 0.025, transparent: true, opacity: 0.42 }));
scene.add(dust);

const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
renderTarget.texture.colorSpace = THREE.SRGBColorSpace;
const postScene = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: renderTarget.texture }, uTime: { value: 0 },
    uIntensity: { value: capabilities.overview.post }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uIntensity; uniform vec2 uResolution; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    void main(){
      vec2 uv=vUv; vec2 center=uv-.5; float shift=.0025*uIntensity;
      vec3 color=vec3(texture2D(tDiffuse,uv+vec2(shift,0.)).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-vec2(shift,0.)).b);
      float scanline=sin(uv.y*uResolution.y*1.4+uTime*4.)*.025*uIntensity;
      float noise=(hash(floor(uv*uResolution.xy*.42)+floor(uTime*18.))-.5)*.07*uIntensity;
      float vignette=smoothstep(.78,.18,dot(center,center));
      color=(color+scanline+noise)*mix(1.,vignette,.48*uIntensity); gl_FragColor=vec4(color,1.);
    }`,
  depthWrite: false, depthTest: false
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(10, 10);
const drag = { active: false, moved: false, x: 0, y: 0, yaw: 0, pitch: 0 };
const state = {
  activeKey: "overview", postGoal: capabilities.overview.post,
  tour: { active: false, index: 0, elapsed: 0 },
  projectile: { active: false, age: 0, launches: 0, hits: 0, velocity: new THREE.Vector3() },
  pulse: 0, fps: 60, fpsAccumulator: 0, fpsFrames: 0, textureAccumulator: 1
};
const tourKeys = ["overview", "spatial", "surface", "physics", "postfx", "overview"];
const trailHistory = Array.from({ length: trailLength }, () => new THREE.Vector3());

function updatePanel(key) {
  const data = capabilities[key];
  panelIndex.textContent = data.index;
  panelTitle.innerHTML = data.title.replace("\n", "<br>");
  panelDescription.textContent = data.description;
  panelInput.textContent = data.input;
  panelMechanism.textContent = data.mechanism;
  panelValue.textContent = data.value;
  modeValue.textContent = data.label;
  nodeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.node === key));
}

function stopTour() {
  state.tour.active = false;
  tourButton.textContent = "开始 40 秒导览";
}

function selectCapability(key, { keepTour = false } = {}) {
  const data = capabilities[key];
  if (!data) return;
  state.activeKey = key;
  cameraGoal.set(...data.camera);
  targetGoal.set(...data.target);
  state.postGoal = data.post;
  updatePanel(key);
  if (!keepTour) stopTour();
}

function startTour() {
  state.tour.active = true;
  state.tour.index = 0;
  state.tour.elapsed = 0;
  tourButton.textContent = "暂停导览";
  selectCapability(tourKeys[0], { keepTour: true });
}

function launchSignal({ keepTour = false } = {}) {
  selectCapability("physics", { keepTour });
  const projectile = state.projectile;
  projectile.active = true;
  projectile.age = 0;
  projectile.launches += 1;
  projectile.velocity.set(1.62, 6.02, -4.55);
  orb.position.set(0, 1.02, 3.2);
  orb.visible = true;
  trail.visible = true;
  trailHistory.forEach((point) => point.copy(orb.position));
  scoreValue.textContent = `${projectile.hits} / ${projectile.launches}`;
}

function updateProjectile(delta) {
  const projectile = state.projectile;
  if (!projectile.active) return;
  projectile.age += delta;
  projectile.velocity.y -= 9.6 * delta;
  orb.position.addScaledVector(projectile.velocity, delta);
  trailHistory.pop();
  trailHistory.unshift(orb.position.clone());
  for (let index = 0; index < trailLength; index += 1) {
    trailPositions[index * 3] = trailHistory[index].x;
    trailPositions[index * 3 + 1] = trailHistory[index].y;
    trailPositions[index * 3 + 2] = trailHistory[index].z;
  }
  trailGeometry.attributes.position.needsUpdate = true;
  if (orb.position.distanceTo(receiver.position) < 0.78) {
    projectile.hits += 1;
    projectile.active = false;
    state.pulse = 1;
    orb.visible = false;
    scoreValue.textContent = `${projectile.hits} / ${projectile.launches}`;
  } else if (orb.position.y < 0.08) {
    orb.position.y = 0.08;
    projectile.velocity.multiply(new THREE.Vector3(0.86, -0.46, 0.86));
  }
  if (projectile.age > 4.3) {
    projectile.active = false;
    orb.visible = false;
    trail.visible = false;
  }
}

function updateLiveTexture(time) {
  const width = liveCanvas.width;
  const height = liveCanvas.height;
  const activeColor = state.activeKey === "surface" ? "#67d7ff" : "#7d9795";
  liveContext.fillStyle = "#071014";
  liveContext.fillRect(0, 0, width, height);
  liveContext.strokeStyle = "rgba(103,215,255,.12)";
  liveContext.lineWidth = 1;
  for (let x = 0; x < width; x += 48) { liveContext.beginPath(); liveContext.moveTo(x, 0); liveContext.lineTo(x, height); liveContext.stroke(); }
  for (let y = 0; y < height; y += 48) { liveContext.beginPath(); liveContext.moveTo(0, y); liveContext.lineTo(width, y); liveContext.stroke(); }
  liveContext.fillStyle = activeColor;
  liveContext.font = "700 22px monospace";
  liveContext.fillText("LIVE SURFACE / CANVAS TEXTURE", 30, 44);
  liveContext.fillStyle = "#edf1e7";
  liveContext.font = "600 62px sans-serif";
  liveContext.fillText(`${state.fps.toFixed(0)} FPS`, 30, 120);
  liveContext.fillStyle = "#8ea2a0";
  liveContext.font = "500 18px monospace";
  liveContext.fillText(`MODE ${state.activeKey.toUpperCase()}`, 32, 158);
  liveContext.strokeStyle = activeColor;
  liveContext.lineWidth = 5;
  liveContext.beginPath();
  for (let x = 0; x < width - 60; x += 4) {
    const phase = x / 56 + time * 2.2;
    const y = 310 + Math.sin(phase) * 52 + Math.sin(phase * 0.41) * 26;
    if (x === 0) liveContext.moveTo(x + 30, y); else liveContext.lineTo(x + 30, y);
  }
  liveContext.stroke();
  liveContext.fillStyle = "#edf1e7";
  liveContext.font = "700 26px monospace";
  liveContext.fillText("2D CANVAS", 30, 458);
  liveContext.fillStyle = "#566d68";
  liveContext.fillText("→", 260, 458);
  liveContext.fillStyle = activeColor;
  liveContext.fillText("GPU TEXTURE", 318, 458);
  liveTexture.needsUpdate = true;
}

function updateTour(delta) {
  if (!state.tour.active) return;
  state.tour.elapsed += delta;
  if (state.tour.elapsed < 6.4) return;
  state.tour.elapsed = 0;
  state.tour.index += 1;
  if (state.tour.index >= tourKeys.length) return stopTour();
  const key = tourKeys[state.tour.index];
  selectCapability(key, { keepTour: true });
  if (key === "physics") launchSignal({ keepTour: true });
}

function updateScene(time, delta) {
  const motionScale = reducedMotion ? 0 : 1;
  heroCore.rotation.y = time * 0.18 * motionScale;
  core.rotation.x = time * 0.22 * motionScale;
  core.rotation.z = time * 0.13 * motionScale;
  dust.rotation.y = time * 0.012 * motionScale;
  stations.forEach(({ beacon, halo, label }, key) => {
    const selected = state.activeKey === key;
    beacon.rotation.y = time * (selected ? 1.1 : 0.36) * motionScale;
    beacon.position.y = 0.7 + (selected ? 0.11 : 0) + Math.sin(time * 1.8) * 0.035 * motionScale;
    halo.scale.setScalar(1 + (selected ? 0.13 : 0) + Math.sin(time * 2.3) * 0.025 * motionScale);
    label.quaternion.copy(camera.quaternion);
  });
  state.pulse = Math.max(0, state.pulse - delta * 1.4);
  receiverRing.scale.setScalar(1 + state.pulse * 0.48);
  receiverRing.material.emissiveIntensity = 0.6 + state.pulse * 5;
  receiverDisc.material.opacity = 0.08 + state.pulse * 0.55;
  const easing = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
  orbitOffset.set(drag.yaw * 1.35, drag.pitch * 0.8, Math.abs(drag.yaw) * 0.25);
  cameraDestination.copy(cameraGoal).add(orbitOffset);
  camera.position.lerp(cameraDestination, easing);
  lookTarget.lerp(targetGoal, easing);
  camera.lookAt(lookTarget);
  postMaterial.uniforms.uIntensity.value = THREE.MathUtils.lerp(postMaterial.uniforms.uIntensity.value, reducedMotion ? Math.min(state.postGoal, 0.22) : state.postGoal, easing);
  postMaterial.uniforms.uTime.value = time;
}

function updateTelemetry(delta) {
  state.fpsAccumulator += delta;
  state.fpsFrames += 1;
  if (state.fpsAccumulator >= 0.5) {
    state.fps = state.fpsFrames / state.fpsAccumulator;
    state.fpsAccumulator = 0;
    state.fpsFrames = 0;
    callsValue.textContent = renderer.info.render.calls.toLocaleString();
    trianglesValue.textContent = renderer.info.render.triangles.toLocaleString();
  }
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  updateTour(delta);
  updateProjectile(delta);
  updateScene(time, delta);
  state.textureAccumulator += delta;
  if (state.textureAccumulator > 0.08) { updateLiveTexture(time); state.textureAccumulator = 0; }
  renderer.info.reset();
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);
  updateTelemetry(delta);
  requestAnimationFrame(render);
}

function setPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

canvas.addEventListener("pointerdown", (event) => {
  drag.active = true; drag.moved = false; drag.x = event.clientX; drag.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  setPointer(event);
  if (!drag.active) {
    raycaster.setFromCamera(pointer, camera);
    canvas.style.cursor = raycaster.intersectObjects(interactiveMeshes, false).length ? "pointer" : "grab";
    return;
  }
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  drag.yaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.004, -1.4, 1.4);
  drag.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.003, -0.85, 0.85);
  drag.x = event.clientX; drag.y = event.clientY;
});
canvas.addEventListener("pointerup", (event) => {
  drag.active = false;
  if (drag.moved) return;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactiveMeshes, false)[0];
  if (hit?.object.userData.key) selectCapability(hit.object.userData.key);
});

nodeButtons.forEach((button) => button.addEventListener("click", () => selectCapability(button.dataset.node)));
tourButton.addEventListener("click", () => state.tour.active ? stopTour() : startTour());
signalButton.addEventListener("click", () => launchSignal());
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat && event.target === document.body) { event.preventDefault(); launchSignal(); }
  if (event.code === "Escape") selectCapability("overview");
});
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.6));
  renderer.setSize(width, height, false);
  renderTarget.setSize(width, height);
  postMaterial.uniforms.uResolution.value.set(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});

const initialKey = Object.hasOwn(capabilities, query.get("node")) ? query.get("node") : "overview";
selectCapability(initialKey, { keepTour: true });
render();
