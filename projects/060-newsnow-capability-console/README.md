# NewsNow 能力控制台

> 将 NewsNow 拆解为“多源采集—缓存门控—字段标准化—网页 / API / MCP 交付”的信号输入层，并通过交互网页说明它的能力、边界、场景与扩展路线。

![NewsNow 能力控制台封面，以来源适配、缓存、标准化和多端交付展示项目架构](images/cover.svg)

## 项目信息

- 原仓库：<https://github.com/ourongxing/newsnow>
- 原站：<https://newsnow.busiyi.world/>
- 网页演示：[`demo/index.html`](demo/index.html)
- 完整来源台账：[`SOURCES.md`](SOURCES.md)
- 研究状态：已完成来源级源码核对
- 主要技术：TypeScript、React、Nitro、SQLite / Cloudflare D1、MCP
- 研究版本：NewsNow v0.0.41，`2173126f804bec0201769f59d933add6c4632d17`
- 最后更新：2026-09-05

## 为什么关注

NewsNow 表面是一个多栏热榜阅读器，源码中更值得复用的是一套轻量信号接入模式：每个平台由独立 getter 负责取数，再统一成 `NewsItem`，通过缓存控制访问频率，最后同时服务网页、JSON API 和 MCP。它适合作为外部信息雷达的输入层，但不应被误认为完整的新闻分析或舆情系统。

本次研究重点回答六个问题：有哪些来源、每个来源怎样获取、一次请求怎样流经系统、适合进入哪些业务场景、目前缺少哪些关键能力，以及团队应当把差异化建设放在哪里。

## 来源结论

来源层是这个仓库最有价值、也最容易被表面页面掩盖的部分。按固定源码版本逐项核对后：

- Cloudflare 实例可见 47 个非重定向来源条目，由 41 个 getter 家族实现。
- 其中 25 个走 JSON / API，13 个解析 HTML，4 个读取 RSS，3 个从 HTML 或 JavaScript 抽取内嵌 JSON，2 个实现 API + RSS 回退。
- 另有 5 个来源条目只在 Cloudflare 构建关闭：36氪快讯、人气榜，哔哩哔哩热门视频、排行榜，以及快手热榜。
- LINUX DO、果核剥壳、什么值得买等 getter 仍在源码中，但注册配置默认关闭；“代码存在”和“实例可见”是两种状态。
- 获取方式并非都很轻：微博依赖静态 Cookie，财联社需要签名，酷安需要动态 App Token，抖音和雪球先取会话 Cookie，卫星通讯社在 Cloudflare 上依赖额外代理。
- 联合早报展示项实际抓取第三方“早晨报”页面；参考消息的源码端点使用 HTTP。这类真实链路比 Logo 或来源名称更值得在生产审计中披露。

逐项入口、刷新间隔、getter 文件与维护风险见 [NewsNow 来源与获取方式台账](SOURCES.md)。

## 核心能力

- 多源聚合：当前 Cloudflare 演示实例可见 47 个非重定向来源，覆盖国内、国际、科技、财经和体育。
- 两类阅读模型：热榜来源显示排名并计算刷新前后的位次变化；实时来源按发布时间呈现时间线。
- 关注与同步：用户可收藏数据源，并在关注页拖拽排序；偏好先保存在浏览器，登录后可同步到数据库。
- 标准化接口：`GET /api/s?id=<source>` 返回统一的来源状态、更新时间和最多 30 条 `NewsItem`。
- 缓存回源：按来源配置 2–60 分钟刷新间隔，全局 TTL 默认为 30 分钟；上游失败且存在缓存时降级返回旧数据。
- AI 接入：官方 `newsnow-mcp-server` 把同一 API 包装为 `get_hottest_latest_news` 工具。
- 自部署：支持 Node / Docker、Cloudflare Pages + D1，以及按环境切换数据库连接器。

## 设计与实现

### 采集适配

`server/sources` 中每个来源对应一个 getter。不同 getter 可调用上游 JSON API、用 Cheerio 解析 HTML、读取 RSS，或通过 RSSHub 获取结构化内容。`server/getters.ts` 在构建时自动收集这些模块，从而形成以来源 ID 为键的统一采集注册表。

### 缓存决策

核心接口位于 `server/api/s/index.ts`：

1. 校验来源 ID，并处理主来源到子来源的重定向。
2. 查询 SQLite 或 Cloudflare D1 中的来源快照。
3. 如果仍处于该来源的刷新间隔，直接复用缓存。
4. 如果在全局 TTL 内，普通请求仍返回缓存；公开实例只允许登录用户强制回源。
5. 满足回源条件时调用 getter，并把最多 30 条结果覆盖写入缓存。
6. getter 失败且存在旧缓存时返回旧缓存；没有旧缓存时错误会继续上抛。

这是一种请求驱动的 pull-through cache，并非持续运行的全网爬虫。源码中所谓不同来源的“动态”刷新，本质是为来源预先配置不同间隔，并不是算法学习出来的调度周期。

### 数据模型与消费端

所有采集结果统一为 `NewsItem`：核心字段包括 `id`、`title`、`url`、可选的 `mobileUrl`、`pubDate` 与 `extra`。React 前端通过 React Query 缓存请求，并只在卡片进入视口时加载；MCP Server 则读取相同 API，把前 N 条转成 Markdown 链接列表。

## 网页设计

网页采用“热点信号控制台”而不是传统长报告：

- 首屏可切换“最热、实时、关注、MCP”四种能力视图，并切换四类代表性来源。
- 来源图谱可按栏目、获取方式或关键字筛选全部 47 个来源，并逐项查看上游入口、刷新门控、源码文件和维护风险。
- 来源登记流水线展示 `pre-sources.ts → source.ts → getters.ts → /api/s` 的配置、生成、装载与交付关系。
- 关闭项抽屉区分 Cloudflare 环境关闭与源码默认关闭，避免把 getter 数量误当成实例可用数量。
- 底层原理区可逐层查看请求入口、缓存门控、来源适配、字段标准化和交付端。
- 能力矩阵明确区分仓库已实现能力和仍需建设的情报能力。
- 角色工作台覆盖管理层、产品研发、品牌公关、内容团队与 AI Agent。
- 扩展路线按采集可靠性、历史与语义、分析与行动三阶段排序。
- 所有示例新闻标题明确标记为示意快照，不请求或冒充实时数据。

## 本地运行与验证

在仓库根目录执行：

```powershell
python -m http.server 4178 --bind 127.0.0.1 --directory projects/060-newsnow-capability-console/demo
```

然后访问 <http://127.0.0.1:4178/>。

已验证页面可以从本地静态服务器正常返回；来源搜索、栏目与方法筛选、关闭项展开、首屏来源和模式切换、架构分层、角色场景与键盘方向键导航均由原生 JavaScript 实现。页面不依赖第三方运行时，也不会从公共 NewsNow 实例跨域拉取数据。

## 可复用的启发

- 把每个外部平台隔离为小型 getter，可以把上游差异限制在采集层。
- 统一最小数据契约比试图统一新闻全文更容易长期维护，也更适合作为 AI 工具输入。
- 请求驱动缓存能够显著降低小型部署的资源和封禁风险，但需要额外健康监控才能满足生产可靠性。
- 公共热点数据只是线索；组织的壁垒来自行业词表、历史数据、去重聚类、可信度判断和业务反馈闭环。
- MCP 的价值是把已有 API 变成模型可发现的工具，不会自动产生摘要、事实核查或业务结论。

## 局限与边界

- HTML 抓取和非官方接口会随页面结构、反爬策略或上游权限改变而失效。
- 当前缓存覆盖保存每个来源的最新列表，无法直接用于长期趋势、传播路径或回测。
- 热榜排名由上游平台定义，不同来源之间的热度不能直接横向比较。
- 原仓库不包含跨源去重、全文索引、事实核查、自动摘要与通知规则。
- 公共演示实例没有生产 SLA；正式集成应自部署，并审查来源条款、版权、访问频率和账户安全。

## 图片说明

图片的来源和文字说明记录在 [images/README.md](images/README.md)。

## 参考资料

- [NewsNow 项目 README](https://github.com/ourongxing/newsnow/blob/main/README.zh-CN.md)
- [数据源配置](https://github.com/ourongxing/newsnow/blob/main/shared/pre-sources.ts)
- [来源采集器](https://github.com/ourongxing/newsnow/tree/main/server/sources)
- [来源 API 与缓存决策](https://github.com/ourongxing/newsnow/blob/main/server/api/s/index.ts)
- [缓存表实现](https://github.com/ourongxing/newsnow/blob/main/server/database/cache.ts)
- [统一类型定义](https://github.com/ourongxing/newsnow/blob/main/shared/types.ts)
- [官方 MCP Server](https://github.com/ourongxing/newsnow-mcp-server)
