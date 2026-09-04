# Arnis World Forge

![Arnis World Forge 封面](images/cover.svg)

> 把真实世界的开放地理数据，编译为可玩的 Minecraft / Luanti 方块世界。

- 上游仓库：[louis-e/arnis](https://github.com/louis-e/arnis)
- 本地快照：`main` / `3384d3e0` / Arnis `3.1.0`
- 许可：上游主代码 Apache-2.0；地理数据、3D 模型与素材需分别遵循上游 `NOTICE` 中的许可和署名要求
- 展示状态：可离线浏览；命令实验室只生成命令，不调用地图服务、不生成真实世界

## 一句话判断

Arnis 不是“把地图图片贴进 Minecraft”，而是一条多源地理数据编译流水线：获取与统一开放数据，通过确定性语义规则解决地形、道路、建筑、水体和设施之间的空间关系，最后编码成多个游戏世界格式。

## 它能做什么

| 能力域 | 输入 | 主要结果 |
| --- | --- | --- |
| 地形 | Mapterhorn、USGS、AWS 等 DEM；Moon / Mars 的 NASA PDS 数据 | 真实高程、坡地、海床、水体雕刻、道路贴地 |
| 城市语义 | OpenStreetMap、可选 Overture Maps 建筑 | 建筑、道路、铁路、桥梁、隧道、机场、停车场和设施 |
| 生态地表 | ESA WorldCover、Köppen 气候、Meta/WRI 树冠 | 森林、农田、湿地、沙地、生物群系和树木高度 |
| 世界细节 | 3DMR、Wikimedia/Wikidata、内置 schematic | 地标模型、车辆、船、起重机、树木、可读标牌 |
| 交付 | 统一的方块世界编辑状态 | Java Anvil、Bedrock `.mcworld`、Luanti `map.sqlite`、PNG 预览 |

当前源码快照包含 163 个 Rust 文件、26 个元素处理器模块和 35 个 CLI 长参数。运行 `npm run sync` 可重新从 `source/arnis` 提取这些指标。

## 底层原理

```text
bbox / 本地 OSM
        │
        ├── OSM / Overture ── 建筑、道路、水系与设施
        ├── DEM ───────────── 地形高度
        ├── ESA / Canopy ──── 地表与树木
        └── 3D / Schematics ─ 地标与道具
        ↓
坐标投影 + ProcessedElement 统一模型
        ↓
按领域处理器执行语义规则、优先级与冲突消解
        ↓
WorldEditor 方块状态
        ↓
Java / Bedrock / Luanti writer
```

关键不是单个格式 writer，而是中间这层“地理语义 → 世界构件”的规则系统。它通过专门处理器解释 OSM 标签；标签缺失时使用确定性启发式补足高度、材质和形态；地形后处理再处理道路、桥梁、隧道和水系对高程的影响。

## 典型使用场景

- 家乡、校园、景区、历史区域的方块世界复刻
- Minecraft 城市服、活动地图和 UGC 内容的自动底图
- 地理、城市规划、防灾和公共空间的低成本教学可视化
- 游戏关卡或虚拟场景的快速空间原型，之后再人工精修
- 开放地理数据到离散 3D 世界的算法研究基线

它不适合工程测绘和实时数字孪生：开放数据有缺口，方块化会损失精度，部分外观来自程序推断，而且当前架构是批处理生成器，不是持续同步的仿真运行时。

## 可扩展方向

1. **区域 DEM Provider**：`ElevationProvider` 是最明确的现成扩展点，可接入新的国家或企业高程源。
2. **本地化规则包**：扩展建筑材料、屋顶、植被、道路设施和区域 OSM 标签映射。
3. **人工纠错工作台**：在自动生成后修正轮廓、高度、道路和材质，形成可回写的编辑闭环。
4. **中间表示与多后端**：抽出稳定的 `GeoIR → SceneIR → World Sink`，降低 Minecraft 方块语义耦合，输出 glTF、3D Tiles 或自有引擎格式。
5. **增量与分布式生成**：建立地理对象到 Region/Chunk 的依赖索引，支持局部重算、任务切片和数据更新。
6. **质量评估**：把几何偏差、语义完整度、规则命中率和人工修正量做成可测指标。

## 对我们的意义

- 如果目标就是 Minecraft / Luanti 内容生产，它已经是一条可直接 fork 的成熟基线，优先补本地数据、风格规则和编辑体验。
- 如果目标是通用 3D / UGC 平台，最值得复用的是多源数据统一、语义处理器、冲突消解和分块写出的编译器思路，而不是直接绑定其 Anvil 输出。
- 如果目标是测绘或数字孪生，它更适合作为快速可视化参照；精度、时态、权限、数据治理与仿真能力需要独立体系。

## 展示页

```powershell
cd E:\0904_codex_project\projects\070-arnis-worldforge
npm run sync
npm run build
npm run serve
```

打开 `http://127.0.0.1:4173`。展示页包含：

若端口已被占用，可在 PowerShell 中执行 `$env:PORT=4177; npm run serve` 改用其他端口。

- 可开关图层的三种合成场景
- 五类能力证据卡与五阶段原理拆解
- 可复制的 Java / Bedrock / Luanti CLI 命令实验室
- 适用边界、扩展难度和采用建议
- 从当前源码自动生成的版本与结构快照

展示页是研究界面，不会调用外部地图 API。生成的命令需要在已安装 Rust 和对应运行依赖的环境中，于 `source/arnis` 目录执行。

## 获取与更新上游源码

上游已浅克隆在 `source/arnis`，保留独立 `.git` 历史：

```powershell
git -C source/arnis pull --ff-only
npm run sync
```

若需要重新获取：

```powershell
git clone --filter=blob:none --depth 1 https://github.com/louis-e/arnis.git source/arnis
```

## 目录结构

```text
070-arnis-worldforge/
├── demo/                  # 零运行时依赖的交互展示
├── dist/                  # npm run build 生成，不入库
├── images/                # 项目封面
├── scripts/               # 源码快照、构建和静态服务脚本
├── source/arnis/          # 上游浅克隆，独立 Git 仓库
├── DESIGN_CONTRACT.md     # 展示页验收契约
└── VALIDATION.md          # 验证记录
```

## 证据入口

- [CLI 参数](https://github.com/louis-e/arnis/blob/main/src/args.rs)
- [总生成流程](https://github.com/louis-e/arnis/blob/main/src/main.rs)
- [OSM 解析与中间元素](https://github.com/louis-e/arnis/blob/main/src/osm_parser.rs)
- [元素处理器](https://github.com/louis-e/arnis/tree/main/src/element_processing)
- [高程模块](https://github.com/louis-e/arnis/tree/main/src/elevation)
- [世界输出](https://github.com/louis-e/arnis/tree/main/src/world_editor)
- [第三方数据与资产署名](https://github.com/louis-e/arnis/blob/main/NOTICE)
