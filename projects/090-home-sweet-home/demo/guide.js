const architecture = {
  bootstrap: {
    index: "01 / RENDER BOOTSTRAP",
    runtime: "CPU → GPU",
    title: "先搭好相机、渲染器与控制器",
    description: "Three.js 把 Scene、Camera、Light、Mesh 组织起来，WebGLRenderer 再把绘制命令提交给 GPU。",
    input: "Canvas + viewport",
    output: "可渲染的 3D 舞台",
    code: `const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 220);
const controls = new OrbitControls(camera, canvas);`
  },
  geometry: {
    index: "02 / PROCEDURAL FORMS",
    runtime: "CPU / BUILD ONCE",
    title: "用基础几何体组装四套低模形态",
    description: "Box、Cylinder、Sphere 与 Plane 被组合成家具和植物。每个 form 都是 Group，先全部创建，再用 scale=0 隐藏非当前形态。",
    input: "Geometry + Material",
    output: "forms[4]",
    code: `const forms = [
  gardenBenchForm(), sofaForm(),
  diningBenchForm(), bedForm()
];
forms.forEach(form => actor.group.add(form));`
  },
  actor: {
    index: "03 / ACTOR STATE",
    runtime: "CPU / DATA MODEL",
    title: "Actor 将语义、外形与空间状态绑定",
    description: "同一个 Actor 在四个场景中拥有四个 form 和四组 transform。于是“沙发”是角色名，不再是某个固定 Mesh。",
    input: "forms[] + states[] + timing",
    output: "可跨场景调度的 Actor",
    code: `defineActor({
  forms: [bench, sofa, diningBench, bed],
  states: [gardenState, livingState, diningState, bedState],
  timing: { delay, lift, switchAt }
});`
  },
  director: {
    index: "04 / MORPH DIRECTOR",
    runtime: "CPU / EVERY FRAME",
    title: "转场导演把离散状态变成连续动作",
    description: "startMorph() 记录起点与终点；stepMorph() 按错峰延迟更新位置、最短角旋转、上浮轨迹和两套 form 的缩放。",
    input: "from scene + to scene + elapsed",
    output: "连续 transform + form switch",
    code: `const localT = clamp((elapsed - actor.delay) / duration, 0, 1);
actor.group.position.lerpVectors(from.pos, to.pos, ease(localT));
oldForm.scale.setScalar(shrink(localT));
newForm.scale.setScalar(pop(localT));`
  },
  style: {
    index: "05 / GLOBAL ATMOSPHERE",
    runtime: "CPU UNIFORMS → GPU",
    title: "场景权重同时驱动颜色、材质与光照",
    description: "四个空间不是只换家具。floor、rug、wall 与 lighting 根据同一组权重插值；昼夜模式继续改变天空、曝光和发光强度。",
    input: "scene weights + day/night mode",
    output: "统一的视觉氛围",
    code: `uniforms.uWeights.value.copy(sceneWeights);
hemiLight.intensity = lerp(dayHemi, nightHemi, nightMix);
renderer.toneMappingExposure = lerp(1.0, 0.72, nightMix);`
  },
  loop: {
    index: "06 / FRAME COMMIT",
    runtime: "RAF / CPU + GPU",
    title: "tick() 是所有变化唯一的提交点",
    description: "每帧先读时间，再更新 Morph、Shader、灯光和 OrbitControls，最后只渲染一次。共享时钟让对象、材质与镜头保持同一节奏。",
    input: "clock delta + interaction",
    output: "最终像素",
    code: `function tick(now) {
  stepMorph(now);
  updateUniforms(now);
  updateLighting(now);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}`
  }
};

const actorStates = [
  { form: "gardenBenchForm()", icon: "BENCH", position: "[-1.40, 0.30, -1.95]", rotation: "0.15 rad", scale: "1.00" },
  { form: "sofaForm()", icon: "SOFA", position: "[-0.55, 0.34, 0.05]", rotation: "-0.58 rad", scale: "1.00" },
  { form: "diningBenchForm()", icon: "SEAT", position: "[0.55, 0.30, 0.15]", rotation: "1.57 rad", scale: "0.88" },
  { form: "bedForm()", icon: "BED", position: "[0.10, 0.28, -0.10]", rotation: "0.02 rad", scale: "1.06" }
];

const routes = {
  story: {
    level: "最短路线 / 1–2 个模块",
    title: "把四个空间变成一段可理解的品牌故事",
    description: "保留当前程序化场景，增加镜头导演、字幕节点和自动播放；适合官网 Hero、活动页和作品集。",
    steps: [
      ["抽出 scene config", "场景名称、文案、镜头、配色不再散落在源码中。"],
      ["加入 director timeline", "同一时间轴控制 Morph、镜头、字幕和停留。"],
      ["定义完成证据", "自动播放一轮后回到可自由探索状态。"]
    ],
    test: "90 秒内自动讲完四个空间，用户可随时接管镜头。"
  },
  configurator: {
    level: "产品路线 / 3–5 个模块",
    title: "让空间状态从预设动画升级为用户配置",
    description: "保留 Actor 数据模型，增加拾取、属性面板、约束校验和状态序列化；适合户型搭配、家具陈列与方案比较。",
    steps: [
      ["稳定对象 ID 与 schema", "为 Actor、form、材质和可编辑属性建立可持久化标识。"],
      ["加入 Raycaster 选择", "点击物体后用 DOM 面板编辑尺寸、颜色和候选形态。"],
      ["保存与恢复方案", "把用户状态序列化到 URL、localStorage 或服务端。"]
    ],
    test: "用户修改三件家具后刷新页面，方案仍能准确恢复。"
  },
  assets: {
    level: "资产路线 / 3–4 个模块",
    title: "用真实产品模型替换程序化占位形态",
    description: "Actor 结构仍然成立，但 forms 改由 GLTFLoader 异步提供，并补上 Draco/KTX2、缓存、加载进度与资源释放。",
    steps: [
      ["建立 GLTF 资产规范", "统一单位、原点、朝向、材质命名、LOD 和包围盒。"],
      ["实现 AssetManager", "负责预加载、去重、克隆、取消、错误占位和 dispose。"],
      ["设置性能预算", "限制纹理分辨率、三角面、draw call 与首屏下载体积。"]
    ],
    test: "弱网下先出现可交互占位场景，真实资产到达后无跳位替换。"
  },
  engine: {
    level: "工程路线 / 4–6 个模块",
    title: "把单文件作品拆成可测试、可复用的小型引擎",
    description: "先分离渲染、Actor、场景、Shader 和 UI 责任，再引入构建、类型、测试与性能采样；不必先迁移到某个框架。",
    steps: [
      ["按责任拆模块", "先保持行为不变，把全局变量收束到明确接口。"],
      ["配置驱动场景", "Actor 与 scene data 可独立校验、组合和版本化。"],
      ["建立回归证据", "截图、交互测试、FPS、显存与资源释放都纳入门禁。"]
    ],
    test: "新增第五个空间只增加配置与资产，不修改 Morph 核心。"
  },
  vertex: {
    level: "高约束路线 / 资产与 Shader 联动",
    title: "只有需要连续表面形变时，才做真正顶点 Morph",
    description: "MorphTarget 要求基础网格与目标网格具有一一对应的顶点拓扑。沙发变床通常不满足，应改用 Blender 制作兼容目标或自定义 Shader 位移。",
    steps: [
      ["先验证拓扑对应", "所有目标必须拥有相同顶点数量、顺序和语义。"],
      ["选择动画方式", "标准 morphAttributes 适合兼容资产；复杂效果用纹理缓存顶点位置。"],
      ["保留对象级过渡", "不兼容的零件仍采用显隐、缩放或粒子解构。"]
    ],
    test: "在 0–1 权重任意位置都无破面、穿插和法线闪烁。"
  }
};

function activateButtons(buttons, selected) {
  buttons.forEach((button) => {
    const active = button === selected;
    button.classList.toggle("active", active);
    if (button.getAttribute("role") === "tab") {
      button.setAttribute("aria-selected", String(active));
    }
    if (button.hasAttribute("aria-pressed")) {
      button.setAttribute("aria-pressed", String(active));
    }
  });
}

const architectureButtons = [...document.querySelectorAll("[data-arch]")];
architectureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = architecture[button.dataset.arch];
    activateButtons(architectureButtons, button);
    document.querySelector("#arch-index").textContent = item.index;
    document.querySelector("#arch-runtime").textContent = item.runtime;
    document.querySelector("#arch-title").textContent = item.title;
    document.querySelector("#arch-description").textContent = item.description;
    document.querySelector("#arch-input").textContent = item.input;
    document.querySelector("#arch-output").textContent = item.output;
    document.querySelector("#arch-code").textContent = item.code;
  });
});

const actorButtons = [...document.querySelectorAll("[data-actor-scene]")];
actorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.actorScene);
    const state = actorStates[index];
    activateButtons(actorButtons, button);
    document.querySelector("#actor-index").textContent = String(index);
    document.querySelector("#actor-icon").textContent = state.icon;
    document.querySelector("#actor-form").textContent = state.form;
    document.querySelector("#actor-position").textContent = state.position;
    document.querySelector("#actor-rotation").textContent = state.rotation;
    document.querySelector("#actor-scale").textContent = state.scale;
  });
});

const sceneButtons = [...document.querySelectorAll("[data-scene]")];
const sceneFrame = document.querySelector("#scene-frame");
sceneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateButtons(sceneButtons, button);
    sceneFrame.src = `upstream-index.html?scene=${button.dataset.scene}`;
  });
});

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const range = document.querySelector("#timeline-range");
const oldForm = document.querySelector("#form-old");
const newForm = document.querySelector("#form-new");

function updateTimeline() {
  const percent = Number(range.value);
  const t = percent / 100;
  const local = clamp((t - 0.17) / 0.65);
  const move = easeInOutCubic(local);
  const lift = Math.sin(Math.PI * local);
  const oldScale = 1 - clamp(local / 0.46);
  const newScale = local < 0.46 ? 0 : easeOutBack(clamp((local - 0.46) / 0.54));
  const travel = 60;
  const liftPx = -42 * lift;

  oldForm.style.transform = `translate(${travel * move}%, ${liftPx}px) scale(${oldScale})`;
  oldForm.style.opacity = String(clamp(oldScale * 1.4));
  newForm.style.transform = `translate(${-travel * (1 - move)}%, ${liftPx}px) scale(${newScale})`;
  newForm.style.opacity = String(clamp(newScale * 1.5));

  let phase = "等待 / STAGGER";
  let explain = "每个 Actor 先等待自己的 stag 延迟";
  if (t >= 0.17 && local < 0.46) {
    phase = "旧形态收缩 / SHRINK";
    explain = "Actor 移动并上浮，旧 form 逐渐缩到 0";
  } else if (local >= 0.46 && local < 0.85) {
    phase = "形态切换 / POP IN";
    explain = "旧 form 已隐藏，新 form 用 back easing 弹出";
  } else if (local >= 0.85) {
    phase = "落位 / SETTLE";
    explain = "Actor 到达目标 transform，材质与光照同步收敛";
  }

  document.querySelector("#timeline-phase").textContent = phase;
  document.querySelector("#timeline-explain").textContent = explain;
  document.querySelector("#timeline-output").textContent = `${percent}%`;
  document.querySelector("#metric-move").textContent = move.toFixed(2);
  document.querySelector("#metric-lift").textContent = lift.toFixed(2);
  document.querySelector("#metric-old").textContent = oldScale.toFixed(2);
  document.querySelector("#metric-new").textContent = newScale.toFixed(2);
}

range.addEventListener("input", updateTimeline);
updateTimeline();

const routeButtons = [...document.querySelectorAll("[data-route]")];
routeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const route = routes[button.dataset.route];
    activateButtons(routeButtons, button);
    document.querySelector("#route-level").textContent = route.level;
    document.querySelector("#route-title").textContent = route.title;
    document.querySelector("#route-description").textContent = route.description;
    document.querySelector("#route-test").textContent = route.test;
    document.querySelector("#route-steps").innerHTML = route.steps
      .map(([title, detail]) => `<li><b>${title}</b><span>${detail}</span></li>`)
      .join("");
  });
});
