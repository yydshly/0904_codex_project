const stages = {
  source: {
    index: "01 / SOURCE",
    title: "各平台公开榜单，是它的原始信号源",
    description: "微博热搜、知乎热榜、百度热点、公众号热文、技术社区排行、财经媒体榜单，以及其他公开排名页或 JSON 接口。",
    tags: ["公开排行页面", "公开 JSON 接口", "用户定制节点"],
  },
  collect: {
    index: "02 / COLLECT",
    title: "每个节点都有独立的采集适配规则",
    description: "系统定时访问目标地址，通过 HTML 正则匹配或 JSON 字段路径，提取榜单中的标题、链接、简介、图片和热度等字段。",
    tags: ["定时刷新", "HTML / MATCH", "JSON / PATH"],
  },
  normalize: {
    index: "03 / NORMALIZE",
    title: "异构榜单被转换为同一种数据语言",
    description: "不同来源的数据统一为节点、标题、链接、简介、缩略图、附加热度和时间等字段，形成可搜索、可比较的基础记录。",
    tags: ["统一字段", "来源标识", "分类与时间"],
  },
  store: {
    index: "04 / STORE",
    title: "周期性快照把即时排行变成历史资产",
    description: "当前列表之外，系统还保存上榜时间、历史数据集和榜单快照，因此可以观察排名变化、热度持续时间与事件演进。",
    tags: ["当前状态", "历史数据", "榜单快照"],
  },
  deliver: {
    index: "05 / DELIVER",
    title: "同一组信号，被送往阅读、分析和自动化场景",
    description: "标准化数据可以通过网页、移动 App、搜索、日报、提醒机器人、CSV 导出、REST API 与 Webhook 被人或系统继续使用。",
    tags: ["Web / App", "API / Webhook", "通知与导出"],
  },
};

const detail = document.querySelector("#stage-detail");
const buttons = [...document.querySelectorAll(".pipeline-step")];

function renderStage(stageName) {
  const stage = stages[stageName];
  if (!stage || !detail) return;

  buttons.forEach((button) => {
    const active = button.dataset.stage === stageName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  detail.innerHTML = `
    <span class="stage-index">${stage.index}</span>
    <div>
      <h2>${stage.title}</h2>
      <p>${stage.description}</p>
    </div>
    <ul>${stage.tags.map((tag) => `<li>${tag}</li>`).join("")}</ul>
  `;
}

buttons.forEach((button, index) => {
  button.addEventListener("click", () => renderStage(button.dataset.stage));
  button.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = buttons[(index + direction + buttons.length) % buttons.length];
    next.focus();
    renderStage(next.dataset.stage);
  });
});

const scenarios = {
  strategy: {
    question: "外部环境正在发生哪些值得管理层关注的变化？",
    input: "行业媒体、财经榜单、关键公司与政策词",
    process: "跨来源归并、变化速度与业务相关性判断",
    output: "每日外部信号简报与重大变化预警",
    boundary: "只能发现线索，不能代替战略验证与专家判断",
  },
  content: {
    question: "今天该做什么选题，什么时候进入热点最合适？",
    input: "社交热搜、内容平台、垂直社区与热点日历",
    process: "主题聚类、上升速度、受众与品牌相关性筛选",
    output: "选题池、内容角度、发布时间与素材链接",
    boundary: "不能直接复制热门内容，仍需原创与版权判断",
  },
  brand: {
    question: "品牌、人物或产品是否出现异常升温与负面风险？",
    input: "品牌词、产品词、高管姓名、竞品与风险关键词",
    process: "新上榜检测、跨平台共振、排名变化与排除规则",
    output: "分级预警、事件时间线和原始证据链接",
    boundary: "热榜覆盖不是全量社媒监听，长尾风险可能漏报",
  },
  product: {
    question: "竞品、技术和用户关注点发生了什么变化？",
    input: "竞品名称、功能词、开发社区与垂直媒体节点",
    process: "实体归并、需求主题识别、周期对比与异常检测",
    output: "竞品动态卡片、机会假设与需要验证的问题",
    boundary: "公众热度不能直接代表真实需求和付费意愿",
  },
  research: {
    question: "一个事件怎样出现、扩散、达到峰值并逐步退潮？",
    input: "历史上榜数据、快照、来源、排名与附加热度",
    process: "时间序列、跨平台比较、传播节点和持续性分析",
    output: "事件时间线、趋势图、来源矩阵与研究数据集",
    boundary: "各平台热度口径不同，比较前必须标准化",
  },
  developer: {
    question: "怎样把热点信号接入内部看板、机器人或 AI Agent？",
    input: "节点列表、最新榜单、历史、搜索、快照与日历 API",
    process: "缓存、增量同步、去重、权限控制与业务标签映射",
    output: "JSON 数据、Webhook 事件、内部查询工具和自动摘要",
    boundary: "生产使用应走官方 API，并遵守来源及平台条款",
  },
};

const scenarioDetail = document.querySelector("#scenario-detail");
const scenarioButtons = [...document.querySelectorAll("[data-scenario]")];

function renderScenario(name) {
  const scenario = scenarios[name];
  if (!scenario || !scenarioDetail) return;

  scenarioButtons.forEach((button) => {
    const active = button.dataset.scenario === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  scenarioDetail.innerHTML = `
    <div class="scenario-question"><span>CORE QUESTION</span><h3>${scenario.question}</h3></div>
    <dl>
      <div><dt>输入</dt><dd>${scenario.input}</dd></div>
      <div><dt>处理</dt><dd>${scenario.process}</dd></div>
      <div><dt>输出</dt><dd>${scenario.output}</dd></div>
      <div><dt>边界</dt><dd>${scenario.boundary}</dd></div>
    </dl>
  `;
}

scenarioButtons.forEach((button, index) => {
  button.addEventListener("click", () => renderScenario(button.dataset.scenario));
  button.addEventListener("keydown", (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = scenarioButtons[(index + direction + scenarioButtons.length) % scenarioButtons.length];
    next.focus();
    renderScenario(next.dataset.scenario);
  });
});

const navLinks = [...document.querySelectorAll(".topnav a")];
const navTargets = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        link.classList.toggle("is-current", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.25, 0.5] },
  );
  navTargets.forEach((target) => observer.observe(target));
}
