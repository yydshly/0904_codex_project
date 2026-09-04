# NewsNow 来源与获取方式台账

> 源码快照：NewsNow `v0.0.41`，commit [`2173126`](https://github.com/ourongxing/newsnow/tree/2173126f804bec0201769f59d933add6c4632d17)，核对日期 2026-09-05。

这份台账回答三个容易混淆的问题：页面上有哪些来源、这些来源实际从哪里取数、源码中的“已实现”与部署后的“可用”有什么差别。

## 统计口径

- `shared/pre-sources.ts` 是人工维护的来源登记表；`scripts/source.ts` 据此生成 `shared/sources.json`。
- 主来源如果包含多个子源，会额外生成一个重定向别名。本文不把重定向别名重复计数。
- 排除 `disable: true` 后，源码注册表有 52 个非重定向来源条目。
- Cloudflare 构建再排除 5 个 `disable: "cf"` 条目，因此网页实例可见 47 个来源条目。
- 47 个条目由 41 个 getter 家族实现；财联社、华尔街见闻等一个 getter 文件可输出多个子源。
- “可见”只代表注册并允许在该构建中显示，不代表上游接口此刻健康。

## 获取方式分布

| 方式 | 条目数 | 实现特征 | 主要维护风险 |
| --- | ---: | --- | --- |
| JSON / API | 25 | 请求 JSON 接口或 JSON Feed，再映射字段 | 参数、签名、Cookie、风控、响应 schema |
| HTML 解析 | 13 | 下载页面，用 Cheerio 或正则提取 | DOM、CSS 类名、编码、反爬 |
| RSS | 4 | `defineRSSSource` 或自定义 XML 解析 | Feed 停更、字段差异、代理限制 |
| HTML / JS 内嵌数据 | 3 | 从注释或脚本变量抽取 JSON | 变量名、包裹格式、页面构建变化 |
| API + RSS 回退 | 2 | 结构化 API 优先，失败时读 RSS | 两套路径都需监控；密钥改变运行路径 |

## 47 个 Cloudflare 可见来源

### 国内（17）

| 来源 ID | 页面名称 | 类型 / 间隔 | 获取方式 | 上游入口 | getter | 关键说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `baidu` | 百度热搜 | 热榜 / 10m | 内嵌数据 | `top.baidu.com/board?tab=realtime` | `baidu.ts` | 从 HTML 注释 `s-data` 抽取 JSON |
| `bilibili-hot-search` | 哔哩哔哩·热搜 | 热榜 / 10m | JSON API | `s.search.bilibili.com/main/hotword` | `bilibili.ts` | CF 只开放热搜子源 |
| `chongbuluo-hot` | 虫部落·最热 | 热榜 / 30m | HTML / Cheerio | `chongbuluo.com/forum.php?…view=hot` | `chongbuluo.ts` | 解析论坛表格 |
| `chongbuluo-latest` | 虫部落·最新 | 时间线 / 30m | RSS | `chongbuluo.com/forum.php?mod=rss…` | `chongbuluo.ts` | 与最热共用家族但走 RSS |
| `douban` | 豆瓣·热门电影 | 热榜 / 10m | JSON API | `m.douban.com/rexxar/api/v2/subject/recent_hot/movie` | `douban.ts` | 需 Referer |
| `douyin` | 抖音·热搜 | 热榜 / 10m | JSON API | `douyin.com/aweme/v1/web/hot/search/list/` | `douyin.ts` | 先访问登录域取得 Cookie |
| `freebuf` | FreeBuf·网络安全 | 热榜 / 10m | RSS | `freebuf.com/feed` | `freebuf.ts` | 自定义 XML 解析；非 CF 环境有 curl 回退 |
| `ifeng` | 凤凰网·热点资讯 | 热榜 / 10m | 内嵌数据 | `ifeng.com/` | `ifeng.ts` | 从 `var allData` 读取 `hotNews1` |
| `iqiyi-hot-ranklist` | 爱奇艺·热播榜 | 热榜 / 30m | JSON API | `mesh.if.iqiyi.com/portal/lw/v7/channel/card/videoTab` | `iqiyi.ts` | Referer、device 与页面模块参数必需 |
| `nowcoder` | 牛客·热搜 | 热榜 / 10m | JSON API | `gw-c.nowcoder.com/api/sparta/hot-search/top-hot-pc` | `nowcoder.ts` | 按内容类型选择 id / uuid 链接 |
| `qqvideo-tv-hotsearch` | 腾讯视频·热搜榜 | 热榜 / 30m | JSON API | `pbaccess.video.qq.com/…/getCard` | `qqvideo.ts` | POST 复杂页面布局请求体 |
| `tencent-hot` | 腾讯新闻·综合早报 | 热榜 / 30m | JSON API | `i.news.qq.com/web_backend/v2/getTagInfo` | `tencent.ts` | 固定 tagId，不是全站榜 |
| `thepaper` | 澎湃新闻·热榜 | 热榜 / 30m | JSON API | `cache.thepaper.cn/contentapi/wwwIndex/rightSidebar` | `thepaper.ts` | 取首页侧栏 `hotNews` |
| `tieba` | 百度贴吧·热议 | 热榜 / 10m | JSON API | `tieba.baidu.com/hottopic/browse/topicList` | `tieba.ts` | 直接映射话题列表 |
| `toutiao` | 今日头条·热点事件 | 热榜 / 10m | JSON API | `toutiao.com/hot-event/hot-board/` | `toutiao.ts` | 以事件 Cluster ID 生成链接 |
| `weibo` | 微博·实时热搜 | 热榜 / 2m | HTML / Cheerio | `s.weibo.com/top/summary?cate=realtimehot` | `weibo.ts` | 依赖静态 SUB Cookie 与表格选择器 |
| `zhihu` | 知乎·热榜 | 热榜 / 10m | JSON API | `zhihu.com/api/v3/feed/topstory/hot-list-web` | `zhihu.ts` | 保留热度文本与摘要 |

### 财经（12）

| 来源 ID | 页面名称 | 类型 / 间隔 | 获取方式 | 上游入口 | getter | 关键说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `cls-depth` | 财联社·深度 | 时间线 / 10m | 签名 JSON API | `cls.cn/v3/depth/home/assembled/1000` | `cls/index.ts` | 查询串通过 SHA-1 + MD5 生成 `sign` |
| `cls-hot` | 财联社·热门 | 热榜 / 10m | 签名 JSON API | `cls.cn/v2/article/hot/list` | `cls/index.ts` | 与其他财联社子源共用签名工具 |
| `cls-telegraph` | 财联社·电报 | 时间线 / 5m | 签名 JSON API | `cls.cn/v1/roll/get_roll_list` | `cls/index.ts` | 携带 Referer 并过滤广告 |
| `fastbull-express` | 法布财经·快讯 | 时间线 / 2m | HTML / Cheerio | `fastbull.com/cn/express-news` | `fastbull.ts` | 读取 `data-date` 后排序 |
| `fastbull-news` | 法布财经·头条 | 时间线 / 30m | HTML / Cheerio | `fastbull.com/cn/news` | `fastbull.ts` | 解析 trending 卡片 |
| `gelonghui` | 格隆汇·事件 | 时间线 / 2m | HTML / Cheerio | `gelonghui.com/news/` | `gelonghui.ts` | 将中文相对时间转成时间戳 |
| `jin10` | 金十数据·快讯 | 时间线 / 10m | JS 内嵌数据 | `jin10.com/flash_newest.js` | `jin10.ts` | 去掉 `var newest =` 后解析 JSON |
| `mktnews-flash` | MKTNews·快讯 | 时间线 / 2m | JSON API | `api.mktnews.net/api/flash` | `mktnews.ts` | 需 Origin / Referer；API 返回 50 条 |
| `wallstreetcn-hot` | 华尔街见闻·最热 | 热榜 / 30m | JSON API | `api-one.wallstcn.com/…/articles/hot` | `wallstreetcn.ts` | 热门文章接口 |
| `wallstreetcn-news` | 华尔街见闻·最新 | 时间线 / 30m | JSON API | `api-one.wallstcn.com/…/information-flow` | `wallstreetcn.ts` | 过滤主题、广告和 live 资源 |
| `wallstreetcn-quick` | 华尔街见闻·快讯 | 时间线 / 5m | JSON API | `api-one.wallstcn.com/…/lives` | `wallstreetcn.ts` | 全球频道快讯 |
| `xueqiu-hotstock` | 雪球·热门股票 | 热榜 / 2m | JSON API | `stock.xueqiu.com/v5/stock/hot_stock/list.json` | `xueqiu.ts` | 先访问行情页获取 Cookie，过滤广告 |

### 科技（11）

| 来源 ID | 页面名称 | 类型 / 间隔 | 获取方式 | 上游入口 | getter | 关键说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `aihot` | AIHOT·全部 | 时间线 / 5m | API + RSS 回退 | `aihot.virxact.com/api/public/items` | `aihot.ts` | API 空或报错时回退 `/feed/all.xml` |
| `coolapk` | 酷安·今日最热 | 热榜 / 10m | JSON API | `api.coolapk.com/v6/page/dataList` | `coolapk/index.ts` | 动态生成 Device ID 与 X-App-Token |
| `github-trending-today` | GitHub·Trending Today | 热榜 / 10m | HTML / Cheerio | `github.com/trending` | `github.ts` | 提取仓库、Star 与描述 |
| `hackernews` | Hacker News·Top | 热榜 / 10m | HTML / Cheerio | `news.ycombinator.com/` | `hackernews.ts` | 输出 HN 讨论链接和积分 |
| `ithome` | IT之家·最新 | 时间线 / 10m | HTML / Cheerio | `ithome.com/list/` | `ithome.ts` | 解析相对时间并按关键词过滤广告 |
| `juejin` | 稀土掘金·文章榜 | 热榜 / 10m | JSON API | `api.juejin.cn/content_api/v1/content/article_rank` | `juejin.ts` | 固定 `category_id=1` |
| `pcbeta-windows11` | 远景论坛·Win11 | 时间线 / 5m | RSS | `bbs.pcbeta.com/forum.php?mod=rss&fid=563` | `pcbeta.ts` | Windows 资源子源已实现但默认关闭 |
| `producthunt` | Product Hunt·Today | 热榜 / 10m | GraphQL + RSS 回退 | `api.producthunt.com/v2/api/graphql` | `producthunt.ts` | 有 Token 走 GraphQL，否则/失败走 Feed |
| `solidot` | Solidot·最新 | 时间线 / 60m | RSS | `solidot.org/index.rss` | `solidot.ts` | 最简 `defineRSSSource` 实现 |
| `sspai` | 少数派·热门文章 | 热榜 / 10m | JSON API | `sspai.com/api/v1/article/tag/page/get` | `sspai.ts` | 按热门文章标签请求 |
| `v2ex-share` | V2EX·最新分享 | 时间线 / 10m | JSON Feed | `v2ex.com/feed/{4 nodes}.json` | `v2ex.ts` | 并发合并 create、ideas、programmer、share |

### 国际（5）

| 来源 ID | 页面名称 | 类型 / 间隔 | 获取方式 | 上游入口 | getter | 关键说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `cankaoxiaoxi` | 参考消息·最新 | 时间线 / 30m | JSON | `china.cankaoxiaoxi.com/json/channel/{3 channels}/list.json` | `cankaoxiaoxi.ts` | 并发合并三频道；源码使用 HTTP |
| `kaopu` | 靠谱新闻·最新 | 时间线 / 30m | HTML / Cheerio | `kaopu.news/` | `kaopu.ts` | 按 story URL 去重；来源自身提醒多看多思考 |
| `sputniknewscn` | 卫星通讯社·最新 | 时间线 / 10m | HTML + CF 代理 | `sputniknews.cn/services/widget/lenta/` | `sputniknewscn.ts` | Cloudflare 环境改走 NewsNow Vercel 代理 |
| `steam` | Steam·在线人数 | 热榜 / 10m | HTML / Cheerio | `store.steampowered.com/stats/stats/` | `steam.ts` | 这是产品使用热度，不是新闻 |
| `zaobao` | 联合早报·实时 | 时间线 / 30m | HTML / Cheerio | `zaochenbao.com/realtime/` | `zaobao.ts` | 实际抓第三方“早晨报”，GB2312 解码 |

### 体育（2）

| 来源 ID | 页面名称 | 类型 / 间隔 | 获取方式 | 上游入口 | getter | 关键说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `dongqiudi` | 懂球帝·头条 | 时间线 / 10m | JSON API | `api.dongqiudi.com/app/tabs/web/1.json` | `dongqiudi.ts` | 按上游时间排序，保留缩略图与分类 |
| `hupu` | 虎扑·主干道热帖 | 热榜 / 10m | HTML / 正则 | `bbs.hupu.com/topic-daily-hot` | `hupu.ts` | 正则匹配列表标记，DOM 变更容错较低 |

## 未出现在 Cloudflare 可见 47 项中的来源

### 仅 Cloudflare 构建关闭

| 来源 ID | 获取方式 | 说明 |
| --- | --- | --- |
| `36kr-quick` | HTML / Cheerio | `disable: "cf"` |
| `36kr-renqi` | HTML / Cheerio | `disable: "cf"` |
| `bilibili-hot-video` | JSON API | `disable: "cf"` |
| `bilibili-ranking` | JSON API | `disable: "cf"` |
| `kuaishou` | HTML 内嵌 JSON | 注释明确写明 Cloudflare Pages 无法访问 |

### 默认关闭但 getter 仍保留

- LINUX DO：`latest` 与 `hot` 两个 JSON API 子源，整个来源 `disable: true`。
- 果核剥壳：HTML getter，并带 Cloudflare 代理分支，来源 `disable: true`。
- 什么值得买：HTML / Cheerio getter，来源 `disable: true`。
- 远景论坛·Windows 资源：getter 中存在 `pcbeta-windows` RSS，但该子源在注册配置中关闭。

这说明注册配置、getter 实现和某一部署环境的可见列表是三层不同状态，审计时不能只数 `server/sources` 文件。

## 源码怎样组织来源

```text
shared/pre-sources.ts
  └─ 人工登记名称、栏目、hot/realtime、interval、disable、sub
       ↓ scripts/source.ts
shared/sources.json + shared/pinyin.json + shared/updated-sources.ts

server/sources/{*.ts,**/index.ts}
  └─ defineSource / defineRSSSource / defineRSSHubSource / proxySource
       ↓ server/getters.ts 构建期 glob
Record<SourceID, SourceGetter>
       ↓ GET /api/s?id=<source>
缓存门控 → getter → slice(0, 30) → NewsItem[]
```

关键抽象：

- `defineSource` 既接收单个 getter，也可接收 `{ sourceId: getter }`，因此一个文件可以实现多个子源。
- `defineRSSSource` 经 `rss2json` 转成 `id/title/url/pubDate`。
- `defineRSSHubSource` 固定以 `https://rsshub.rssforever.com` 为基址；当前 47 个可见来源没有直接使用它，但扩展接口已经具备。
- `proxySource` 在 `CF_PAGES` 环境改读代理 API，其他环境仍直接抓上游。
- `myFetch` 统一设置浏览器 User-Agent、10 秒超时、3 次重试；个别 getter 再叠加 Cookie、Referer、Origin、Token 或签名。
- `/api/s` 最终只返回 getter 结果的前 30 条。getter 自己返回更多数据并不会扩大 API 输出。

## 生产化最需要补的四类能力

1. **来源健康度**：逐源记录成功率、P50/P95 延迟、连续空结果、HTTP 状态、最近一次成功时间。
2. **结构漂移检测**：对字段缺失率、条目数量突变和 DOM 选择器失配告警，而不是把空数组视为正常。
3. **来源契约与合规**：记录接口性质、登录/Cookie、访问条款、版权、抓取频率和数据留存边界。
4. **降级策略**：关键来源准备 API/RSS/代理多路径；避免像静态 Cookie、单一代理和复杂页面参数成为单点。

## 新增一个来源的最短路径

1. 在 `shared/pre-sources.ts` 登记来源与子源，选择栏目、类型、刷新间隔和环境禁用条件。
2. 在 `server/sources/<id>.ts` 实现 getter；优先结构化接口，其次 RSS，最后才是 HTML 解析。
3. 将结果映射到 `NewsItem`，保证 `id`、`title`、`url` 稳定，并按需补 `pubDate`、`extra.info`、`extra.hover`。
4. 运行来源生成脚本，更新 `sources.json`、拼音索引和变更来源列表。
5. 分别验证冷启动、缓存命中、强制刷新、空结果、上游报错和目标部署环境。
6. 上线前补充健康指标、访问合规说明和维护责任人。

## 源码入口

- [来源注册表](https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/shared/pre-sources.ts)
- [所有 getter](https://github.com/ourongxing/newsnow/tree/2173126f804bec0201769f59d933add6c4632d17/server/sources)
- [getter 自动装载](https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/server/getters.ts)
- [来源工具抽象](https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/server/utils/source.ts)
- [通用抓取配置](https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/server/utils/fetch.ts)
- [来源 API 与缓存](https://github.com/ourongxing/newsnow/blob/2173126f804bec0201769f59d933add6c4632d17/server/api/s/index.ts)
