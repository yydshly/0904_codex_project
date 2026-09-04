const sourceData = {
  weibo: { name: "微博", label: "实时热搜", accent: "source-red", icon: "微", updated: "2 MIN GATE", items: ["跨平台热点开始出现共振", "新品发布进入热搜上升区", "行业政策讨论持续升温", "品牌事件出现新的传播节点", "用户关注从事件转向解释"] },
  github: { name: "GitHub", label: "Trending Today", accent: "source-ink", icon: "GH", updated: "10 MIN GATE", items: ["Agent workflow toolkit", "Local-first research workspace", "Realtime data orchestration", "Open source observability stack", "Multimodal extraction pipeline"] },
  cls: { name: "财联社", label: "热门", accent: "source-blue", icon: "财", updated: "10 MIN GATE", items: ["市场关注新的行业变量", "公司事件进入密集披露期", "资金偏好出现结构性变化", "产业链上下游预期调整", "海外市场信号同步传导"] },
  hackernews: { name: "Hacker News", label: "Top", accent: "source-orange", icon: "Y", updated: "10 MIN GATE", items: ["Designing reliable data adapters", "Why pull-through caching works", "A small protocol for AI tools", "Monitoring changes in public APIs", "The limits of popularity signals"] },
};

const modeNotes = {
  hottest: "保留上游榜单顺序，并在刷新后计算排名变化；它反映平台热度，不代表事实真伪。",
  realtime: "带时间字段的来源按时间线呈现；这是近实时拉取，不是持续流式监听。",
  focus: "收藏的数据源形成个人面板，并可拖拽排序；登录后只同步来源偏好，不同步新闻正文。",
  mcp: "官方 MCP Server 把同一 JSON API 包装为一个取数工具，供 AI 获取前 N 条标题与链接。",
};

let currentSource = "weibo";
let currentMode = "hottest";
const panel = document.querySelector("#feed-panel");
const sourceButtons = [...document.querySelectorAll("[data-source]")];
const modeButtons = [...document.querySelectorAll("[data-mode]")];

function renderFeed() {
  const source = sourceData[currentSource];
  const labels = currentMode === "realtime" ? ["刚刚", "3m", "7m", "12m", "18m"] : ["01", "02", "03", "04", "05"];
  panel.innerHTML = `
    <header class="feed-head">
      <div class="feed-title"><span class="source-icon ${source.accent}">${source.icon}</span><div><h2>${source.name} · ${source.label}</h2><p>${source.updated} / CACHE READY</p></div></div>
      <span class="status-chip">NORMALIZED</span>
    </header>
    <ol class="feed-list">${source.items.map((item, index) => `<li><em>${labels[index]}</em><span>${item}</span><small>${currentMode === "hottest" && index < 2 ? `↑ ${3 - index}` : "SOURCE LINK ↗"}</small></li>`).join("")}</ol>
    <p class="mode-note">${modeNotes[currentMode]}</p>
  `;
}

function selectButton(buttons, activeButton) {
  buttons.forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("is-active", active);
    if (button.hasAttribute("role")) button.setAttribute("aria-selected", String(active));
  });
}

sourceButtons.forEach((button) => button.addEventListener("click", () => { currentSource = button.dataset.source; selectButton(sourceButtons, button); renderFeed(); }));
modeButtons.forEach((button, index) => {
  button.addEventListener("click", () => { currentMode = button.dataset.mode; selectButton(modeButtons, button); renderFeed(); });
  button.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = modeButtons[(index + direction + modeButtons.length) % modeButtons.length];
    next.focus(); next.click();
  });
});

renderFeed();

const atlasLabels = {
  category: { china: "国内", finance: "财经", tech: "科技", world: "国际", sports: "体育" },
  method: { api: "JSON / API", html: "HTML 解析", rss: "RSS", embedded: "内嵌数据", hybrid: "混合回退" },
  type: { hottest: "热榜排序", realtime: "时间线" },
};

const atlasLedger = document.querySelector("#source-ledger");
const atlasDetail = document.querySelector("#source-detail");
const atlasCount = document.querySelector("#atlas-count");
const atlasSearch = document.querySelector("#source-search");
const methodFilter = document.querySelector("#method-filter");
const atlasFilterButtons = [...document.querySelectorAll("[data-atlas-filter]")];
let atlasCategory = "all";
let selectedAtlasId = sourceAtlas[0].id;

function getFilteredSources() {
  const query = atlasSearch.value.trim().toLowerCase();
  return sourceAtlas.filter((source) => {
    const categoryMatch = atlasCategory === "all" || source.category === atlasCategory;
    const methodMatch = methodFilter.value === "all" || source.method === methodFilter.value;
    const haystack = [source.name, source.label, source.id, source.host, source.endpoint, source.access, atlasLabels.method[source.method]].join(" ").toLowerCase();
    return categoryMatch && methodMatch && (!query || haystack.includes(query));
  });
}

function renderSourceDetail(source) {
  if (!source || !atlasDetail) return;
  selectedAtlasId = source.id;
  const sourcePath = `server/sources/${source.file}`;
  const codeUrl = `https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/${sourcePath}`;
  atlasDetail.innerHTML = `
    <div class="source-detail-top">
      <span class="method-badge method-${source.method}">${atlasLabels.method[source.method]}</span>
      <span>${atlasLabels.category[source.category]} / ${atlasLabels.type[source.type]}</span>
    </div>
    <div class="source-detail-title"><span>${source.name.slice(0, 2)}</span><div><h3>${source.name} · ${source.label}</h3><code>${source.id}</code></div></div>
    <dl>
      <div><dt>上游主机</dt><dd>${source.host}</dd></div>
      <div><dt>入口路径</dt><dd><code>${source.endpoint}</code></dd></div>
      <div><dt>刷新门控</dt><dd>${source.interval} 分钟</dd></div>
      <div><dt>获取过程</dt><dd>${source.access}</dd></div>
    </dl>
    <div class="source-risk"><span>MAINTENANCE NOTE</span><p>${source.note}</p></div>
    <a class="code-link" href="${codeUrl}" target="_blank" rel="noreferrer"><span>查看固定版本源码</span><code>${sourcePath} ↗</code></a>
  `;
}

function renderAtlas() {
  const sources = getFilteredSources();
  atlasCount.textContent = `${String(sources.length).padStart(2, "0")} RESULTS`;
  if (!sources.some((source) => source.id === selectedAtlasId)) selectedAtlasId = sources[0]?.id;
  atlasLedger.innerHTML = sources.length ? sources.map((source) => `
    <button type="button" role="option" aria-selected="${source.id === selectedAtlasId}" class="ledger-row${source.id === selectedAtlasId ? " is-active" : ""}" data-atlas-source="${source.id}">
      <span class="ledger-name"><b>${source.name}</b><small>${source.label}</small></span>
      <code>${source.id}</code>
      <span class="method-badge method-${source.method}">${atlasLabels.method[source.method]}</span>
      <span class="ledger-interval">${source.interval}m</span>
    </button>
  `).join("") : `<div class="atlas-empty"><b>没有匹配的来源</b><span>尝试清空搜索词或切换筛选条件。</span></div>`;

  const selected = sources.find((source) => source.id === selectedAtlasId);
  if (selected) renderSourceDetail(selected);
  else atlasDetail.innerHTML = `<div class="atlas-empty"><b>等待选择</b><span>左侧出现匹配来源后，这里会展示获取链路。</span></div>`;

  [...atlasLedger.querySelectorAll("[data-atlas-source]")].forEach((button) => {
    button.addEventListener("click", () => {
      selectedAtlasId = button.dataset.atlasSource;
      renderAtlas();
    });
  });
}

atlasFilterButtons.forEach((button) => button.addEventListener("click", () => {
  atlasCategory = button.dataset.atlasFilter;
  atlasFilterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  renderAtlas();
}));
atlasSearch.addEventListener("input", renderAtlas);
methodFilter.addEventListener("change", renderAtlas);
renderAtlas();

const toggleDisabled = document.querySelector("#toggle-disabled");
const disabledList = document.querySelector("#disabled-list");
disabledList.innerHTML = `
  <div><strong>Cloudflare 构建关闭（5 个条目）</strong>${disabledOnCloudflare.map((source) => `<p><code>${source.id}</code><span>${source.name} · ${source.method}</span></p>`).join("")}</div>
  <div><strong>默认关闭 / 未进入注册表（4 处配置）</strong>${disabledByDefault.map((source) => `<p><b>${source.name}</b><span>${source.detail}</span></p>`).join("")}</div>
`;
toggleDisabled.addEventListener("click", () => {
  const expanded = toggleDisabled.getAttribute("aria-expanded") === "true";
  toggleDisabled.setAttribute("aria-expanded", String(!expanded));
  disabledList.hidden = expanded;
  toggleDisabled.textContent = expanded ? "查看 5 个 Cloudflare 关闭项 + 4 处默认关闭配置" : "收起关闭项";
});

const layers = {
  request: {
    code: "01 / REQUEST",
    title: "同一套输入，服务三种消费者",
    description: "网页卡片、公开 JSON API 与 MCP 工具最终都指向相同的来源接口。前端只在卡片进入视口后发起请求，降低一次打开时的无效访问。",
    tags: ["React Query", "Lazy in-view", "GET /api/s"],
  },
  cache: {
    code: "02 / CACHE GATE",
    title: "先判断是否值得再次访问上游",
    description: "每个来源有独立刷新间隔；全局 TTL 默认为 30 分钟。普通请求优先使用缓存，已登录用户才能在公开实例上触发强制刷新。",
    tags: ["2–60 min interval", "30 min TTL", "SQLite / D1"],
  },
  adapter: {
    code: "03 / SOURCE GETTER",
    title: "每个平台都有一个小型翻译器",
    description: "getter 根据上游条件选择公开 JSON API、HTML 解析、RSS 或 RSSHub，把完全不同的平台响应转换成同一种条目结构。",
    tags: ["ofetch", "Cheerio", "RSS / RSSHub"],
  },
  normalize: {
    code: "04 / NORMALIZE",
    title: "保留最小而稳定的新闻信号",
    description: "统一字段只覆盖条目 ID、标题、链接、发布时间和少量扩展信息。它刻意保持轻量，因此易集成，但没有正文、作者体系或可信度模型。",
    tags: ["id", "title", "url", "pubDate", "extra"],
  },
  delivery: {
    code: "05 / DELIVERY",
    title: "结果既能被人扫读，也能被机器调用",
    description: "React 界面负责热榜与时间线体验；JSON API 服务其他系统；MCP Server 再把 API 包装成 AI 可调用工具。",
    tags: ["Web UI", "JSON API", "MCP stdio"],
  },
};

const layerDetail = document.querySelector("#layer-detail");
const layerButtons = [...document.querySelectorAll("[data-layer]")];

function renderLayer(name) {
  const layer = layers[name];
  if (!layer || !layerDetail) return;
  layerButtons.forEach((button) => {
    const active = button.dataset.layer === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  layerDetail.innerHTML = `<span class="layer-code">${layer.code}</span><h3>${layer.title}</h3><p>${layer.description}</p><div class="layer-tags">${layer.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>`;
}

layerButtons.forEach((button, index) => {
  button.addEventListener("click", () => renderLayer(button.dataset.layer));
  button.addEventListener("keydown", (event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
    const next = layerButtons[(index + direction + layerButtons.length) % layerButtons.length];
    next.focus();
    renderLayer(next.dataset.layer);
  });
});

renderLayer("request");

const scenarios = {
  management: {
    question: "今天有哪些外部变化值得管理层花十分钟确认？",
    input: "政策、财经、行业媒体和关键公司来源",
    action: "汇总高信号标题，跳转原文进一步核实",
    output: "晨间扫描表与需要升级判断的事件清单",
    boundary: "只能缩小关注范围，不能代替战略判断",
  },
  product: {
    question: "竞品、技术和用户注意力正在向哪里移动？",
    input: "GitHub、Hacker News、V2EX、科技媒体与社区",
    action: "按主题归并信号，对比来源与出现频率",
    output: "竞品动态、技术雷达与待验证机会假设",
    boundary: "公众热度不等于真实需求或付费意愿",
  },
  brand: {
    question: "品牌、产品或关键人物是否出现异常升温？",
    input: "社交热榜、新闻媒体与品牌关键词",
    action: "检测新上榜、排名变化和跨平台共振",
    output: "事件线索、风险级别与原始来源链接",
    boundary: "热榜覆盖不是全量舆情监听，可能遗漏长尾",
  },
  content: {
    question: "哪些主题正在进入公共讨论，值得形成原创内容？",
    input: "热搜、视频平台、社区与垂直媒体",
    action: "筛选相关话题，补充来源与差异视角",
    output: "选题池、切入角度和可追溯素材入口",
    boundary: "不能复制热门内容，仍需原创与版权判断",
  },
  agent: {
    question: "怎样让 AI 在回答前先读取最新外部信号？",
    input: "NewsNow JSON API 或官方 MCP 工具",
    action: "按来源拉取前 N 条，再执行聚类、摘要与引用",
    output: "带原始链接的日报、问答上下文与任务触发器",
    boundary: "MCP 只负责取数，事实核查应由上层实现",
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
  scenarioDetail.innerHTML = `<div class="scenario-question"><span>CORE QUESTION</span><h3>${scenario.question}</h3></div><dl><div><dt>输入</dt><dd>${scenario.input}</dd></div><div><dt>动作</dt><dd>${scenario.action}</dd></div><div><dt>输出</dt><dd>${scenario.output}</dd></div><div><dt>边界</dt><dd>${scenario.boundary}</dd></div></dl>`;
}

scenarioButtons.forEach((button, index) => {
  button.addEventListener("click", () => renderScenario(button.dataset.scenario));
  button.addEventListener("keydown", (event) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
    const next = scenarioButtons[(index + direction + scenarioButtons.length) % scenarioButtons.length];
    next.focus();
    renderScenario(next.dataset.scenario);
  });
});

renderScenario("management");

const navLinks = [...document.querySelectorAll(".topbar nav a")];
const navTargets = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.25, 0.5] });
  navTargets.forEach((target) => observer.observe(target));
}
