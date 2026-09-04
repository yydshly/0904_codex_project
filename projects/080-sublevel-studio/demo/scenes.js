const sceneDirections = {
  memory: {
    index: "01",
    kicker: "PRIMARY DIRECTION / 01",
    title: "记忆住宅",
    summary: "把履历变成一套住过的房子：书桌保存作品，相册保存关系，电视保存影像，窗外景色保存人生阶段。空间不是背景，而是记忆的索引。",
    use: "个人作品、人生档案、创作者品牌",
    emotion: "极高",
    assets: "高 · 需要真实照片与英雄道具",
    route: "故事优先 + 模块化住宅 + 5–8 件定制物件",
    zones: ["门厅\n身份", "客厅\n关系", "书房\n作品", "阳台\n未来"],
    note: "物件必须有故事职责：没有内容证据的家具，只会增加加载成本。",
  },
  museum: {
    index: "02",
    kicker: "REUSABLE SYSTEM / 02",
    title: "技术研究博物馆",
    summary: "把项目分类变成展馆，把运行结果变成展品，把源码分析变成解剖台。它最适合组织知识集合，也最容易形成可复用模板。",
    use: "开源研究、能力地图、团队知识库",
    emotion: "中高",
    assets: "中 · 模块化展厅与真实证据图",
    route: "统一展台协议 + 项目数据 + 可运行样本",
    zones: ["大厅\n索引", "展柜\n证据", "实验台\n原理", "档案室\n源码"],
    note: "优先展示真实运行结果；没有证据的展柜不进入主路线。",
  },
  control: {
    index: "03",
    kicker: "LIVE SYSTEM / 03",
    title: "AI 能力控制中心",
    summary: "把模型、Agent、工作流和运行状态映射成设备与管线。空间承担系统关系，DOM 保留精确的日志、成本和任务信息。",
    use: "AI 平台、Agent 运行、技术售前",
    emotion: "中 · 偏理性与掌控感",
    assets: "中 · 程序化设备与实时数据",
    route: "真实状态驱动 + 程序化场景 + DOM 仪表",
    zones: ["任务台\n输入", "模型舱\n推理", "管线\n工具", "观察屏\n结果"],
    note: "设备状态必须来自真实数据，否则只是一张昂贵的科幻皮肤。",
  },
  studio: {
    index: "04",
    kicker: "CREATIVE WORLD / 04",
    title: "数字创意工作室",
    summary: "用电脑、草图墙、摄影台和放映机承载不同媒介的作品。它与传统作品集映射自然，是最稳妥的品牌化空间路线。",
    use: "设计师、导演、开发者、创意团队",
    emotion: "高",
    assets: "中高 · 需要风格统一的工作物件",
    route: "真实作品媒体 + 模块化工作室 + 导览镜头",
    zones: ["前台\n身份", "工作台\n过程", "放映室\n作品", "样品库\n细节"],
    note: "工作痕迹比空旷豪华的空间更能建立创作者的可信度。",
  },
  factory: {
    index: "05",
    kicker: "PROCESS WORLD / 05",
    title: "产品制造工厂",
    summary: "把需求、处理、组件、质检和交付变成一条可观察的生产线。适合解释复杂系统，但情绪应来自节奏和反馈而非装饰。",
    use: "产品架构、设计系统、企业解决方案",
    emotion: "中",
    assets: "中 · 模块化机械与流程动画",
    route: "业务流程建模 + 状态动画 + 案例证据",
    zones: ["收料口\n需求", "装配线\n模块", "质检区\n验证", "发货台\n交付"],
    note: "流水线必须准确表达产品关系，不能为了运动感制造错误流程。",
  },
  city: {
    index: "06",
    kicker: "ECOSYSTEM WORLD / 06",
    title: "微缩产品城市",
    summary: "用建筑代表产品、道路代表数据流、车辆代表任务、地标代表核心能力。它擅长表达生态关系，也最容易因规模失控。",
    use: "多产品矩阵、平台生态、品牌宇宙",
    emotion: "中高",
    assets: "高 · 城市模块、交通和层级细节",
    route: "先做一个街区 + 数据驱动交通 + 分区加载",
    zones: ["广场\n入口", "街区\n产品", "道路\n关系", "地标\n核心"],
    note: "先证明一个街区的信息价值，再决定是否扩展整座城市。",
  },
  case: {
    index: "07",
    kicker: "NARRATIVE WORLD / 07",
    title: "案例调查室",
    summary: "把问题、线索、方案、取舍和结果组织成一间调查室。它能用较低资产成本承载高密度案例叙事。",
    use: "案例复盘、咨询方案、设计过程",
    emotion: "高 · 悬念与发现感",
    assets: "中 · 文件、照片、时间线与桌面物件",
    route: "真实材料 + 线索关系 + 分阶段揭示",
    zones: ["案情墙\n问题", "证物桌\n研究", "推演板\n方案", "档案柜\n结果"],
    note: "线索必须帮助理解决策过程，而不是把普通项目页装饰成侦探主题。",
  },
};

const sceneFocus = document.querySelector("#scene-focus");
const sceneChoices = [...document.querySelectorAll(".scene-choice")];
const blueprint = document.querySelector(".scene-blueprint");
const sceneFields = {
  kicker: document.querySelector("#scene-kicker"),
  title: document.querySelector("#scene-title"),
  summary: document.querySelector("#scene-summary"),
  use: document.querySelector("#scene-use"),
  emotion: document.querySelector("#scene-emotion"),
  assets: document.querySelector("#scene-assets"),
  route: document.querySelector("#scene-route"),
  note: document.querySelector("#scene-note"),
  zones: [1, 2, 3, 4].map((index) => document.querySelector(`#scene-zone-${index}`)),
};

function selectScene(key) {
  const scene = sceneDirections[key];
  if (!scene) return;

  sceneFocus.dataset.scene = key;
  sceneFields.kicker.textContent = scene.kicker;
  sceneFields.title.textContent = scene.title;
  sceneFields.summary.textContent = scene.summary;
  sceneFields.use.textContent = scene.use;
  sceneFields.emotion.textContent = scene.emotion;
  sceneFields.assets.textContent = scene.assets;
  sceneFields.route.textContent = scene.route;
  sceneFields.note.textContent = scene.note;
  sceneFields.zones.forEach((field, index) => {
    field.textContent = scene.zones[index];
  });
  blueprint.setAttribute("aria-label", `${scene.title}的四区空间结构：${scene.zones.join("、").replaceAll("\n", "")}`);

  sceneChoices.forEach((button) => {
    const active = button.dataset.scene === key;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

sceneChoices.forEach((button) => {
  button.addEventListener("click", () => selectScene(button.dataset.scene));
});
