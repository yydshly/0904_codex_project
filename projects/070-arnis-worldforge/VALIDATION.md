# Validation

本文件记录交付前的验证证据；日期按本地工作区时间计算。

## Source

- [x] 上游仓库存在于 `source/arnis`
- [x] `main` 跟踪 `origin/main`
- [x] 快照提交：`3384d3e042e105247df737968f02c481c142d866`
- [x] `cargo metadata --no-deps --format-version 1`
- [x] `cargo check --no-default-features`（通过；16 条上游未使用代码/导入警告）
- [x] `cargo run --no-default-features -- --help`（通过；CLI 报告 3.1.0）

## Showcase

- [x] `npm run sync`
- [x] `npm run build`
- [x] JavaScript 语法检查
- [x] `npm run proof`：本机调用 Arnis 3.1.0 与公开地理数据源生成 Java Anvil 世界
- [x] `npm run samples`：生成慕尼黑、Yosemite、Moon、Mars 四个补充世界，并保留 Arnis 主样例
- [x] 原生 `--map-preview` 载入检查：432 × 345、62,790 bytes
- [x] 真实产物检查：`level.dat`、`region/`、`data/`、`metadata.json`、`icon.png` 与 93 个文件
- [x] 桌面视口浏览器检查
- [x] 820px 平板视口浏览器检查
- [x] 390 × 844 手机视口浏览器检查
- [x] 明暗主题检查
- [x] 真实结果“原始输出 / 数据解释”点击与方向键切换检查
- [x] 六样例轨道点击、左右方向键、证据标签与事实同步检查
- [x] 上游官方截图与五个本机实测样例明确分离
- [x] 预览图片失败兜底检查；运行事实与参数仍然可读
- [x] 场景、图层、能力卡、CLI 联动与复制反馈检查
- [x] 能力页签方向键导航检查
- [x] 浏览器控制台无 warning / error

## Real 3D world

- [x] `npm run world:web`：直接解析慕尼黑 Java Anvil `.mca`，不读取 PNG 生成几何
- [x] 源世界：445 × 278 blocks，`geo-only` / `0.5×`，504 个 Chunk
- [x] 方块证据：605,744 个非空气方块；顶部方块统计保存在 3D manifest
- [x] 网格结果：274,216 个贪心合并后可见面片、21 个简化材质组、4,387,456 bytes
- [x] 真实性标注：真实 Block State 几何 / 简化可审计色板 / 地下外部视图裁切
- [x] 斜视、俯视、地标三种相机按钮均改变实际 WebGL 画布
- [x] Canvas 键盘方向键改变相机；Home 可复位；自动旋转可停止
- [x] Three.js 与 OrbitControls 经 esbuild 打包为本地经典浏览器脚本，不依赖 CDN
- [x] 资源预算：4.2 MiB 世界网格 + 541 KiB 查看器 bundle；Revision 6 最终 1280px 自动验收首次 ready 2,063ms，门槛 15 秒
- [x] `npm run verify:browser`：1280×720、820×900、390×844 全部通过，横向溢出均为 0
- [x] 明暗主题通过；390px reduced-motion 下自动旋转默认关闭
- [x] `?world-error=1` 能力回退：显示同世界原生 PNG，禁用无效 3D 控件，DOM 解释仍可读
- [x] 正常浏览器路径 console/page errors 为 0

## Retired scenario experiment · Revision 5

Revision 5 的三地标文旅任务曾完成以下验证，但已在 Revision 6 删除：它属于网页适配层编排，不能证明 Arnis 的核心交付价值。历史证据保留在 `.runtime/browser-evidence-r5/`。

- [x] 场景选择：慕尼黑奥林匹克公园文旅数字探索；同一真实 3D 世界承载体育场、湖区、奥林匹克塔三站路线
- [x] 三个地标按钮由 Three.js 相机把世界坐标逐帧投影到 DOM；不是固定截图标注
- [x] 桌面主旅程：开始探索 → 键盘 Enter 到达体育场 → 鼠标完成湖区与奥林匹克塔 → 3/3 成果 → 重置为 0/3
- [x] 状态映射：`idle`、`seeking`、`visited`、`complete` 同时改变镜头、地标样式、说明、按钮与进度
- [x] 820px 平板当前地标位于视口内且实际命中对应按钮
- [x] 390×844 + reduced-motion 下三站均为 `projected=true`、位于视口内且实际命中；镜头瞬时到位，无强制过渡
- [x] 明暗主题双向切换后任务和场景层级仍可读；390px 横向溢出为 0
- [x] `?world-error=1` 下任务进入 `error`、入口禁用、地标隐藏；二维预览只解释内容，不伪装可完成任务
- [x] 能力边界文案明确：当前是本地前端任务原型，不宣称账号、奖励、多人或运营后台已经接入
- [x] 浏览器证据：`.runtime/browser-evidence-r5/verification.json` 与桌面开始/完成、平板、手机开始/完成、手机回退截图

## Actual Java world delivery · Revision 6

- [x] `npm run world:package`：从同一慕尼黑生成目录打包完整 Java 世界
- [x] ZIP：`demo/assets/downloads/arnis-munich-olympiapark-java.zip`，1,540,058 bytes
- [x] 世界源文件：221 个、4,529,054 bytes；包含 `level.dat`、`region/`、`data/`、地图预览、图标和 `metadata.json`
- [x] ZIP 根目录为 `Arnis World 1`；`tar -tf` 验证实际目录和文件结构
- [x] SHA-256：`9647798f0fd3e74f2281584b728262124520c0be77f05a98d3019584509228ef`
- [x] 浏览器实际触发下载，得到 1,540,058 bytes；重新计算 SHA-256 与构建清单完全一致
- [x] 桌面、820px、390px 均能看到下载入口；安装说明包含 `%APPDATA%\.minecraft\saves`
- [x] 390px 横向溢出为 0；reduced-motion 下自动旋转关闭；下载与安装说明不依赖 WebGL
- [x] `?world-error=1` 下 3D 控件禁用并显示同世界 PNG，但真实 ZIP 下载仍可用
- [x] 正常浏览器路径 console/page errors 为 0；证据保存在 `.runtime/browser-evidence-r6/`

## Actual run

- [x] 运行标识：`proof-20260905-03`
- [x] 区域：Arnis, Schleswig-Holstein, Germany
- [x] bbox：`54.6291,9.9295,54.6322,9.9362`
- [x] 模式 / 比例：`geo-terrain` / `1×`
- [x] 总耗时 / 核心生成：25.1s / 5.25s
- [x] 运行观察：40 个建筑高度补全、6 个 Overture 新增建筑、23 种标牌贴图、41 张标牌地图瓦片、355 个区域树木 schematic、5.7m 高差
- [x] 数据源：OSM / Overpass、Overture Maps、Mapterhorn DEM、ESA WorldCover 2021、Meta / WRI Canopy、Arnis 区域树包

## Sample suite

- [x] Arnis 海岸小城：`geo-terrain`、432×345、93 个文件、25.1s / 5.25s
- [x] 慕尼黑奥林匹克公园：`geo-only`、445×278、221 个文件、20.9s / 9.96s
- [x] 慕尼黑日志确认放置 4 个仓库内置地标：Olympiastadion、Olympiahalle、Olympia-Schwimmhalle、Olympiaturm
- [x] Yosemite 山谷：`terrain-only`、USGS 3DEP、528×445、1176m 高差、13.8s / 5.57s
- [x] 月球哥白尼环形山：NASA PDS LOLA、200m/block、4× 垂直夸张、524×531、21.3s / 5.18s
- [x] 火星奥林帕斯山：NASA PDS MOLA、500m/block、火星材质、338×356、10.9s / 2.98s
- [x] 上游官方游戏内截图：原样复制自 `source/arnis/assets/git/preview.jpg`，页面标记为“上游官方截图”
- [x] 结构化清单：`demo/assets/samples/sample-suite.json`

## Notes

- 首屏是由 Arnis 真实 `.mca` Block State 导出的 WebGL 3D；原生 `--map-preview` 已降级为二维检查证据与失败回退，不作为 3D 输入。
- 原有合成 SVG 已降级为流水线解释模型，并明确标注 `SYNTHETIC / NOT OUTPUT`。
- 纯雪地形的马特洪峰运行成功但俯视图辨识度不足，未进入主样例轨道；改用能显示岩壁、地表与树冠差异的 Yosemite 山谷。
- 命令实验室不发起网络请求；复制后需在 `source/arnis` 中执行。
- 真实运行日志与世界目录保存在忽略的 `.runtime/proof-20260905-03/`；可移植证据保存在 `demo/assets/actual/`、`demo/actual-run.js` 与 README。
- 补充样例运行目录保存在忽略的 `.runtime/sample-suite-*`；网页只读取落盘 PNG、JSON 与由世界存档导出的二进制网格，不在浏览器请求地理服务。
- 总目录 `npm run catalog:check` 与根站 `npm run pages:build` 通过，共收录 13 个项目。
