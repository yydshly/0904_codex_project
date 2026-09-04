# Design contract — ACT 05 庭院入户与多房间路线

```text
Entry mode: revision-led
Request revision: 5 — 总结研究结论，把原作、机制、扩展图谱、半开住宅与庭院路线统一整理进网页；README 用上游真实预览图引导；完成远端提交
Target user and context: 正在研究沉浸式个人作品展示、需要判断下一步场景产品方向的团队
Desired first impression: 先在一个清楚的研究索引中理解“这是什么、证明了什么、可以看哪些样例”，再自主进入原作或任一扩展场景
Visual ambition: Immersive
Experience architecture: Spatial Stage
Visual constraints: 延续暖橡木、米白织物、陶土、植物绿与蓝紫暮色；庭院石径和发光门是第一视觉锚点；室内保持半开剖面但从每个房间的进入机位表现其独立布局
Information constraints: 网页首屏先给出核心结论、能力边界和五个可运行入口；后续保留原作证据、机制实验、七种扩展方向和住宅深入分析；README 首图必须来自并链接到上游仓库，不把上游图片提交进本仓库
Operation constraints: 主按钮完成庭院入户；房间按钮、3D 地标和完整导览共享路线状态；允许有限环绕观察，任何手动操作可暂停导览；Escape 返回庭院
State constraints: courtyard、foyer、living、study、gallery、terrace 六个可深链状态；entering 为单向门廊转场；每个状态同步相机、门、局部灯光、地标、内容面板与 URL
Environment constraints: 新场景独立在 `demo/residence/journey/`，保留现有 `demo/residence/`；纯静态 CDN ES Module；无授权外部模型；Pages 输出排除上游源码
Scene base: WebGL / Three.js
Scene persistence: 从庭院到露台保持同一 WebGL 世界；详情只在前景侧栏 / 移动 sheet 中变化
Foreground control model: 顶部返回与进度、左侧入户/导览动作、右侧房间叙述、底部房间路线与小型平面图
State-to-scene mapping: courtyard 强调石径和亮门；foyer 开门并显示身份陈列；living 点亮壁炉与照片；study 点亮项目屏；gallery 激活时间画框；terrace 展示后院远景与最终行动；失败时保留完整 DOM 路线
Mobile transformation: 房间详情转为紧凑 bottom sheet；路线横向滚动；小地图折叠为当前/下一站标签；Canvas 仍为全屏背景
Fallback: 静态庭院—住宅剖面构图 + 六个可操作房间按钮 + 当前房间文字，不依赖 WebGL 才能理解路线
Primary journey: 打开研究网页 → 首屏阅读结论 → 从样例索引选择原作 / 机制 / 场景图谱 / 半开住宅 / 庭院住宅 → 返回总览继续阅读完整分析
User-defined phases: 1. 总结相关结论；2. 把信息与全部样例整理进网页；3. README 用源库样例效果图引导；4. 验证、提交并推送远端 GitHub
Required artifacts: 总览索引 HTML / CSS、五个样例入口、README 上游预览图引导、更新后的验证记录、限定于 080 子项目的 Git commit 与 origin push
Autonomy authorization: 用户明确要求整理网页、更新 README、提交并推送远端 GitHub；可完成范围内的可逆实现、验证、commit 与 push
User-decision boundary: 尚无真实住宅总平面、个人内容和授权模型；本轮使用程序化布局与明确占位内容，不虚构私人经历，不加入自由行走、碰撞或后端内容管理
Observable completion criteria: 总览首屏在桌面和移动端都能快速说明核心意义并看到五个入口；所有入口地址正确可操作；原有长内容与 WebGL 状态不回归；README 首图来自并链接上游仓库；浏览器、键盘、减少动态、静态构建通过；只提交 080 子项目并成功推送 origin/main
```

## Coverage record

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 七个场景方向摘要 | 桌面默认态 | 浏览器截图与 DOM | 2–3 | pass | 七个方向与比较字段均可见 |
| 1 | 记忆住宅作为默认首选 | 默认选择态 | 浏览器状态 | 4–6 | pass | 默认 `memory`，选择其他方向后标题、四项事实和空间分区同步更新 |
| 1 | 响应式场景浏览 | 390px 移动端 | 截图、溢出指标 | 7 | pass | 375px client width 下文档 scrollWidth 同为 375px；场景轨道独立横向滚动 |
| 1 | 键盘可选择场景 | 键盘焦点与状态 | 浏览器键盘路径 | 7 | pass | Enter 激活 `case`，焦点保留且 outline 为 solid |
| 2 | 记忆住宅空间与叙事分析 | 深入分析区 | DOM 与内容审阅 | 3 | pass | 门厅、客厅、书房、走廊、阳台五段脚本完整 |
| 2 | 素材难度和质量分级 | 资产路线 | DOM 与 README | 3 / 8 | pass | L1–L4 阶梯与当前 L0 素材边界已记录 |
| 2 | 技术架构和阶段计划 | 实施路线 | DOM 与 README | 3 / 9 | pass | 内容—房间—资产—导演—WebGL/DOM 架构和四阶段路线已接入 |
| 2 | 不伪造生产完成度 | 边界说明 | 页面与 README | 8 | pass | 页面明确标注为垂直切片路线图，未声明完成住宅成品 |
| 交付 | 静态语法、目录和 Pages 构建 | 工程 | 命令输出 | 9 | pass | 三个脚本语法、diff check、目录索引和 12 项目 Pages 构建通过 |
| 1 | 暖色住宅方向有外部依据 | 研究与视觉方向 | 来源记录、页面说明 | 0–2 | pass | README 记录暖橡木、米白织物、低位分层灯光、暮色对比和 CC0 后续资产来源 |
| 2 | 可运行住宅默认画面 | 1280×800 / home | 浏览器截图、Canvas 像素 | 1–3 | pass | 桌面首屏显示完整客厅书房、窗景、暖灯、核心家具和主操作；Canvas 1280×800 |
| 2 | 四个记忆物件联动 | desk / gallery / sound / window | 浏览器交互与 DOM 状态 | 4–6 | pass | 四个按钮均同步更新镜头、body state、hash、详情标题与高光；桌面 / 移动端浏览器验证 |
| 2 | 自动导览与恢复 | tour / home / Escape | 浏览器交互 | 5–6 | pass | 导览 4.4 秒由 home 推进到 desk，再次点击暂停；Escape 回到 home 并将焦点归还 home-button |
| 3 | 从 ACT 03 进入住宅 | 既有 Demo / CTA | 浏览器点击 | 3–5 | pass | ACT 03 新入口实际导航到 `/demo/residence/` |
| 3 | 移动端空间与详情 | 390×844 / touch layout | 浏览器截图、溢出指标 | 7 | pass | 390px 首屏与 desk sheet 截图通过；clientWidth / scrollWidth 均为 390，导航独立横向滚动 |
| 3 | 键盘与焦点 | Tab / Enter / Escape | 浏览器键盘路径 | 7 | pass | 从 home-button 连续 Tab 到 home / desk，outline 为 solid；Enter 激活 desk；Escape 恢复 home 与焦点 |
| 3 | 减少动态与能力回退 | reduced motion / no WebGL | 浏览器状态 | 8 | pass | `?motion=reduce#window` 生效且动画压缩至 0.01ms；`?webgl=off` 隐藏 Canvas 并保留四个可操作记忆按钮 |
| 交付 | 住宅文档、语法与 Pages 构建 | README / JS / 静态输出 | 文件与命令输出 | 9 | pass | 四个 JS 语法检查、12 项目目录检查、Pages 构建通过；产物包含 residence/index.html |
| 1 | 半开住宅样例保持不变 | `/demo/residence/` | 浏览器基线与回归 | 1 / 9 | pass | 原路由保持 `ready / home`、控制台无错误；只增加进入独立子路由的 CTA |
| 2 | 庭院作为明确入口 | journey / courtyard | 桌面截图、Canvas 像素 | 2–3 | pass | 暮色庭院、石径、水景、树影、门廊与发光家门完整可见，Canvas 1280×800 |
| 2 | 引导进门转场 | courtyard → entering → foyer | 浏览器交互 | 4–6 | pass | 页面按钮和三维门均进入 `entering`，约 4.2 秒后到达 `#foyer` 并显示左右房间方向 |
| 3 | 六个空间具有不同职责 | courtyard / foyer / living / study / gallery / terrace | 浏览器状态与 DOM | 3–6 | pass | 六站均有独立机位、布局、局部发光物、展示媒介、标题和下一站关系 |
| 3 | 路线清楚且可恢复 | 房间轨道 / 小地图 / tour / Escape | 浏览器交互 | 4–7 | pass | 直接选择与 hash 深链通过；完整导览可启动/暂停；Escape 返回庭院并恢复焦点 |
| 4 | 现有住宅进入新路线 | ACT 04 CTA | 浏览器点击 | 3–5 | pass | `从庭院进入完整住宅` 实际到达 `/residence/journey/` 的 ready courtyard 状态 |
| 4 | 多端与键盘 | 1280×800 / 760×900 / 390×844 / Tab / Enter / Escape | 截图、DOM 指标、键盘路径 | 7 | pass | 三视口 clientWidth 与 scrollWidth 相等且 Canvas 等大；移动 sheet、路线滚动和可见焦点通过 |
| 4 | 减少动态与能力回退 | motion=reduce / webgl=off | 浏览器状态 | 8 | pass | 减少动态下入户即时完成；强制回退隐藏 Canvas 并保留六站可操作文字路线 |
| 交付 | 文档、稳定关卡数据、语法与构建 | README / JS / Pages | 文件与命令输出 | 9 | pass | README 已记录新路由；六个 zone ID 和六盏可见发光物通过运行时断言；语法、目录和 Pages 构建通过 |
| 1 | 首屏总结核心意义与边界 | 总览页 / summary | 桌面与移动截图、DOM | 2–3 | pass | 首屏以“3D 不是目的，内容才是空间”归纳本质，并呈现三项判断与明确许可边界 |
| 2 | 五个相关样例统一可达 | summary sample index | 点击路径、href、键盘焦点 | 3–7 | pass | 原作、机制、图谱、半开住宅、庭院住宅五个入口地址正确；首项键盘聚焦且 outline 为 solid |
| 2 | 保留原有各幕和实时能力 | original / lab / extensions | 浏览器回归、Canvas 状态 | 5–8 | pass | 原作快照载入；实验台 Canvas 1280×800、31 calls；图谱选中 memory；两套住宅均 ready |
| 3 | README 使用源库效果图引导 | external README | Markdown 链接与远端资源 | 3 / 9 | pass | 首图直接引用上游 raw preview 并链接官方体验，图片说明记录来源、未复制和无许可证边界 |
| 4 | 多端、构建与远端提交 | 1280 / 760 / 390 / git | 浏览器、命令、commit、push | 7–9 | pass | 三视口无横向溢出、无应用 error；五个 JS、目录索引、Pages 三路由与 diff check 通过；commit/push 记录见 Git 历史 |

## Selected WebGL route

```text
Selected pattern: Story-driven 3D portfolio / guided multi-room residence
Evidence branch: residence runtime → preserved semi-open sample → courtyard threshold → room graph → guided camera tour
Required inputs: current warm-residence design system, deterministic room anchors, procedural architecture and explicit content responsibilities; real personal media remains a future replacement layer
Expected output: a separate playable courtyard-to-room journey with one flat navigable plane, motivated lights, deep-linked room states and a readable DOM route
What should update the skill: project documentation only; no reusable skill conclusion without runtime asset evidence
```

## Validation record

- Canonical runtime: `python -m http.server 4188 --bind 127.0.0.1 --directory E:\0904_codex_project`
- Canonical URL: `http://127.0.0.1:4188/projects/080-sublevel-studio/demo/#extensions`
- Desktop: 1265px client width；场景图谱、选择联动、资产与架构卡片、交付路线完成视觉检查。
- Intermediate: 705px client width；场景详情转换为单列，文档无横向溢出。
- Mobile: 375px client width；标题、横向场景轨道、默认记忆住宅、空间图和纵向分析卡片完成视觉检查，文档无横向溢出。
- Interaction: 鼠标切换 `museum` 与键盘 Enter 切换 `case` 均同步更新 `aria-pressed`、标题、事实和四区空间标签。
- Motion: `?motion=reduce#extensions` 下 `body[data-motion=reduced]` 生效，记忆光球动画为 `none`，离屏实验台保持未启动状态。
- Publishing fallback: Pages 产物包含 `scenes.js`、不包含 `source/`；运行时显示七个方向并回退到官方原作地址。
- Supported theme boundary: 本演示只支持既定暗色编辑主题；本轮未引入主题切换。
- ACT 04 route: `http://127.0.0.1:4188/projects/080-sublevel-studio/demo/residence/`
- ACT 04 desktop: Playwright Chromium 1280×800 截图；Canvas 1280×800；document clientWidth / scrollWidth 均为 1280；完整住宅、双区暖光、暮色窗景、左侧叙事和右侧记忆面板可见。
- ACT 04 intermediate / mobile: 760×900 与 390×844 均为等宽文档、等高单屏；移动端 home 隐藏详情，选择 desk 后底部 sheet 可见且不遮蔽节点轨道。
- ACT 04 state: `desk → gallery → sound → window` 均产生正确 hash、body state 和标题；导览推进与暂停通过；键盘焦点、Enter 与 Escape 恢复通过。
- ACT 04 motion / fallback: `?motion=reduce#window` 与 `?webgl=off` 通过；文字住宅保留四个可操作入口；三个测试视口控制台均无应用 error。
- ACT 04 performance observation: 无模型、图片或音频网络负载；程序化场景首次 network-idle 后 800ms 为 ready；DPR 上限为桌面 1.85 / 移动 1.45，页面隐藏时停止帧循环。
- ACT 05 route: `http://127.0.0.1:4188/projects/080-sublevel-studio/demo/residence/journey/`；原 ACT 04 route 保留并增加进入扩展路线的 CTA。
- ACT 05 desktop / intermediate / mobile: Playwright Chromium 的 1280×800、760×900、390×844 均为等宽、等高单屏；Canvas 与视口等大，控制台无应用 error；桌面和移动庭院完成视觉检查。
- ACT 05 scene interaction: 直接点击三维家门进入 `entering`，完成后为 `#foyer`；六站房间按钮分别产生正确 zone、hash、相机目标、局部灯光和内容面板。
- ACT 05 route recovery: 完整导览推进并可手动暂停；Escape 返回 courtyard、焦点恢复到 enter-button；底部六站路线持续可见，桌面另有平面图。
- ACT 05 motion / fallback: `?motion=reduce` 入户即时完成；`?webgl=off` 为 fallback 状态，Canvas 隐藏，六站文字按钮可切换详情。
- ACT 05 engineering: `ZONES` 为六个稳定索引与 y=0 锚点，`LIGHT_SPECS` 为六盏绑定可见发光物的局部光；JS 语法、目录索引、Pages 构建和 diff check 通过。
- Revision 5 summary desktop / tablet / mobile: 1280×800、760×900、390×844 的 document clientWidth 与 scrollWidth 分别相等；summary 为首个 section，五个入口完整存在，控制台无应用 error。
- Revision 5 final visual evidence: `sublevel-summary-desktop.png` 与 `sublevel-summary-mobile.png` 保存在本次会话的外部 visualization 目录，不提交临时浏览器证据。
- Revision 5 sample regression: `#original` 载入本地 `355a1581` 快照；`#lab` 启动 WebGL 后为 31 draw calls；`#extensions` 为 memory；`residence/` 为 ready/home；`residence/journey/` 为 ready/courtyard。
- Revision 5 accessibility / motion / theme: 样例链接可键盘聚焦且 focus outline 为 solid；既有 `?motion=reduce` 路径保持；本演示仅支持已记录的暗色编辑主题。
- Revision 5 README evidence: 上游预览资源 `https://raw.githubusercontent.com/MengTo/sublevel-studio/main/assets/sublevel-studio-preview.jpg` 可访问，点击图片进入官方在线体验；本仓库不保存副本。
- Revision 5 engineering: 五个 JS 语法、13 项目录索引、Pages 构建、summary / residence / journey 产物与 diff check 通过。
- Final decision: revision 5 scoped delivery closed；无 `continue`、`defer` 或 `blocked` 项。
