# Home Sweet Home：四态空间 Morph 展示

> 一个纯前端 Three.js 微缩空间：花园、客厅、餐厅和卧室在同一舞台上连续换景，并同步改变材质、灯光与氛围。

![四个空间状态围绕 Morph 核心切换的能力封面](images/cover.svg)

## 项目信息

- 原仓库：<https://github.com/iamtechartist/home-sweet-home>
- 上游版本：`9b69f10bf12bf93022ddd96ba806a7aaf3185f7c`
- 本地演示：[打开原版 Demo](demo/)
- 上游演示：<https://iamtechartist.github.io/home-sweet-home/>
- 研究状态：已完成首轮能力验证
- 主要技术：Three.js 0.185、WebGL、GLSL、原生 HTML/CSS/JavaScript
- 获取日期：2026-09-05

## 首先看它能展示什么

1. **四空间连续换景**：Garden、Living Room、Dining Room、Bedroom 共用一座微缩舞台，通过对象级编排完成空间用途变化。
2. **程序化低模资产**：家具、植物、墙面、地毯和灯具主要由基础几何体组合生成，不依赖外部 GLB/GLTF 模型。
3. **昼夜氛围切换**：天空、星点、环境光、主光、曝光、灯具辉光和萤火虫会随模式连续变化。
4. **材质与 Shader 动态**：代码生成木纹与织物微纹理，并通过 Shader 实现植物摆动、地面材质混合、地毯图案、灯串和粒子。
5. **空间浏览交互**：支持拖动环绕、滚轮缩放、场景点选、Morph 按钮以及 `M` / `L` 键盘快捷操作。
6. **零构建静态交付**：原作由一个 `index.html` 承载，可直接由静态服务器或 GitHub Pages 发布。

## 能力地图

| 维度 | 已实现 | 当前边界 |
| --- | --- | --- |
| 渲染 | WebGLRenderer、ACES Filmic、PCF 阴影、响应式镜头适配 | 无后处理和画质档位 |
| 场景资产 | 程序化家具、植被、墙体、地毯、灯具、粒子 | 无真实产品模型和资产加载器 |
| 动画 | 对象位移、旋转、缩放、弹性出现、错峰换景 | 不是顶点 Morph Target |
| 光照 | 昼夜插值、局部点光、Emissive、星光和萤火虫 | 没有环境贴图或物理时间系统 |
| 交互 | 四态导航、环绕、缩放、键盘快捷键 | 无物体选择、拖放、编辑或碰撞 |
| 发布 | 单文件静态站、MIT 许可 | 依赖 jsDelivr 和 Google Fonts 网络资源 |

## 关键设计

源码把每个可变对象定义为一个 Actor：

```text
Actor
├─ forms[4]   四个空间中的外形
├─ states[4]  每个空间中的位置、旋转、缩放
└─ timing     延迟、上浮距离、换形时机
```

切换时旧形态先缩小，Actor 沿缓动轨迹移动和旋转，新形态再弹性出现。地板、地毯、墙色和光照不使用离散切换，而是通过四个场景权重连续插值。因此视觉上像“房间发生形变”，底层实质是**语义对象换形 + 舞台调度 + 全局材质过渡**。

## 本地运行

在仓库根目录执行：

```powershell
python -m http.server 4190 --directory projects/090-home-sweet-home/demo
```

然后打开 <http://127.0.0.1:4190/>。不要直接双击 HTML；ES Module 和远程模块加载在 HTTP 环境下更可靠。

## 本地验证清单

- 页面能加载 Garden 首屏，微缩场景、阴影和 UI 正常显示。
- 四个场景按钮均能触发换景，标题和序号同步更新。
- Morph 按钮能够顺序循环四个场景。
- 日夜开关能够改变天空、灯光和发光效果。
- 鼠标拖动可环绕，滚轮可在限制范围内缩放。
- 浏览器控制台无运行时错误。

## 可复用的启发

- 用统一的 Actor 语义槽位表达“同一角色在不同场景中的形态”，比维护四套互不相关的场景更适合做转场。
- 将物体变换、材质权重和光照权重纳入同一帧循环，可以让换景拥有一致的视觉节奏。
- 程序化低模适合品牌微站、概念演示和互动叙事；需要真实商品表现时，再接入 GLTF/KTX2 资产管线。

## 局限与下一步

当前所有场景形态都会预先创建并通过缩放隐藏，重复植物也没有使用 InstancedMesh。项目规模增大后，应优先拆分模块、复用 Geometry、实例化重复对象，并增加资源生命周期、移动端画质档位和 WebGL 降级方案。

下一阶段可以在保留原作的前提下增加“能力导览模式”：自动依次展示四空间换景、昼夜变化、植物摆动和局部灯光，并用 DOM 字幕解释每一步证明了什么。

## 图片说明

封面来源、许可和文字描述见 [images/README.md](images/README.md)。

## 参考资料

- [项目 README](https://github.com/iamtechartist/home-sweet-home)
- [固定版本源码](https://github.com/iamtechartist/home-sweet-home/tree/9b69f10bf12bf93022ddd96ba806a7aaf3185f7c)
- [Three.js 文档](https://threejs.org/docs/)
