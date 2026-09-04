const stages = {
  positioning: {
    index: "01 / 定位",
    evidence: "官网明确",
    evidenceClass: "confirmed",
    title: "先让平台和用户知道“你是谁”",
    summary: "输入产品网址、X 账号或一句营销需求，生成定位、受众、内容主线、关键词和转化路径。它解决的是启号最常见的问题：每天发，但主题漂移。",
    actions: ["提取产品与账号上下文", "形成受众与差异化定位", "生成栏目和内容边界"],
    impact: ["让账号标签更集中", "降低持续创作的决策成本", "提高主页访问后的认知一致性"],
    metric: "主页访问 → 关注转化率",
    source: "https://sopilot.net/zh/workspace"
  },
  signals: {
    index: "02 / 信号",
    evidence: "官网明确",
    evidenceClass: "confirmed",
    title: "不是追所有热点，而是找与定位相交的上升信号",
    summary: "起爆帖监控通过关键词和互动升温信号寻找潜在热点，再让账号在早期评论区出现。它的本质是借用已有分发，不是凭空制造流量。",
    actions: ["按关键词寻找高潜力帖子", "从时间线、起爆帖或 URL 列表获取目标", "过滤不相关用户与否定关键词"],
    impact: ["缩短发现机会的时间", "更早进入已有流量场", "提高账号被目标受众看见的概率"],
    metric: "有效评论曝光 / 主页访问",
    source: "https://sopilot.net/zh/x-auto-engagement"
  },
  production: {
    index: "03 / 生产",
    evidence: "官网明确",
    evidenceClass: "confirmed",
    title: "把灵感型写作改造成可预测的内容供给",
    summary: "专栏定位、批量选题、正文和配图形成生产流水线。技巧型钩子改善首屏注意力，但真正的复利来自主题一致、稳定频率和可辨识的观点。",
    actions: ["批量生成选题与内容日历", "生成正文、推文与跨平台版本", "复用品牌口吻和产品上下文"],
    impact: ["降低单篇内容边际成本", "维持稳定发布节奏", "积累可搜索、可复用的内容资产"],
    metric: "发布完成率 / 收藏率 / 关注率",
    source: "https://sopilot.net/zh/docs/content-column-guide"
  },
  distribution: {
    index: "04 / 分发",
    evidence: "官网明确",
    evidenceClass: "confirmed",
    title: "让同一个观点适配渠道，而不是机械复制",
    summary: "工作台把内容衔接到 X、小红书、公众号、LinkedIn 等渠道；插件在用户已登录的页面中填入或发布内容。官方也建议不同平台分别调整文案。",
    actions: ["生成平台化表达", "通过插件填入目标发布界面", "保存链接，支持后续复盘和再分发"],
    impact: ["减少复制粘贴与格式整理", "增加有效内容触点", "保持跨渠道品牌表达一致"],
    metric: "单篇内容的有效渠道覆盖数",
    source: "https://sopilot.net/zh/docs/content-publishing-management"
  },
  engagement: {
    index: "05 / 互动",
    evidence: "官网明确 / 高风险",
    evidenceClass: "warning",
    title: "主动进入别人的流量，而不是只等自己的帖子起量",
    summary: "时间线、起爆帖和 URL 批量互动可以生成评论、点赞并记录结果。它能扩大触达，但也是最容易越过平台规则和用户预期的环节。",
    actions: ["生成上下文相关评论或引用转帖", "设置间隔、排除用户与关键词", "记录成功、失败、重复和跳过"],
    impact: ["获取评论区二次曝光", "建立目标圈层触点", "把被动发布变成主动分发"],
    metric: "互动 → 主页访问 → 有效关注",
    source: "https://sopilot.net/zh/x-auto-engagement"
  },
  learning: {
    index: "06 / 学习",
    evidence: "能力缺口",
    evidenceClass: "gap",
    title: "真正的增长闭环必须把结果写回下一轮策略",
    summary: "公开资料能证明内容和任务记录，却没有证明曝光、点击、注册或收入数据会自动回流并调整选题。这里是 SoPilot 从自动化工具升级为增长系统的关键缺口。",
    actions: ["现有：保存内容和操作记录", "需要：接入平台表现与转化事件", "需要：按主题、钩子和渠道进行实验归因"],
    impact: ["淘汰无效内容模式", "把频率优化为有效频率", "形成品牌独有的数据与策略资产"],
    metric: "内容主题 → 商业转化的可归因增量",
    source: "https://sopilot.net/zh/workspace"
  }
};

const buttons = [...document.querySelectorAll(".stage-button")];
const output = {
  index: document.querySelector("#stage-index"),
  evidence: document.querySelector("#stage-evidence"),
  title: document.querySelector("#stage-title"),
  summary: document.querySelector("#stage-summary"),
  actions: document.querySelector("#stage-actions"),
  impact: document.querySelector("#stage-impact"),
  metric: document.querySelector("#stage-metric"),
  source: document.querySelector("#stage-source")
};

const renderList = (target, items) => {
  const elements = items.map((item) => {
    const element = document.createElement("li");
    element.textContent = item;
    return element;
  });
  target.replaceChildren(...elements);
};

const activateStage = (key, focus = false) => {
  const stage = stages[key];
  if (!stage) return;

  for (const button of buttons) {
    const active = button.dataset.stage === key;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  }

  output.index.textContent = stage.index;
  output.evidence.textContent = stage.evidence;
  output.evidence.className = `evidence ${stage.evidenceClass}`;
  output.title.textContent = stage.title;
  output.summary.textContent = stage.summary;
  renderList(output.actions, stage.actions);
  renderList(output.impact, stage.impact);
  output.metric.textContent = stage.metric;
  output.source.href = stage.source;
};

buttons.forEach((button, index) => {
  button.tabIndex = index === 0 ? 0 : -1;
  button.addEventListener("click", () => activateStage(button.dataset.stage));
  button.addEventListener("keydown", (event) => {
    const supportedKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!supportedKeys.includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % buttons.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    activateStage(buttons[nextIndex].dataset.stage, true);
  });
});

const updateProgress = () => {
  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = documentHeight > 0 ? window.scrollY / documentHeight : 0;
  const percent = Math.min(1, Math.max(0, ratio)) * 100;
  document.documentElement.style.setProperty("--read-progress", `${percent}%`);
};

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();
