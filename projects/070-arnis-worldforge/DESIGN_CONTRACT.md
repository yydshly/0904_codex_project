# Arnis World Forge · Design Contract

- Entry mode: Brief-led greenfield showcase
- Request revision: 1
- Target user and context: 内部技术、产品与内容团队；希望快速判断 Arnis 能做什么、如何工作、是否值得采用
- Desired first impression: 这不是普通项目介绍页，而是一台把真实地理数据编译成方块世界的“世界铸造台”
- Visual ambition: Editorial
- Experience architecture: Editorial Flow，首屏提供可操作的世界预览与生成控制台，后续按能力、原理、场景、扩展和决策顺序展开
- Visual constraints: 深色地形制图语义；高程、道路、水体、建筑、植被必须有稳定颜色编码；不依赖外部图片和 WebGL
- Information constraints: 所有已实现能力必须能回到当前源码或官方文档；明确区分真实功能与页面示意
- Operation constraints: 零运行时依赖；静态站点；不调用 Overpass、Overture 或高程服务；不真正生成 Minecraft 世界
- State constraints: 场景预设、数据层、生成模式、输出格式、比例和选项可切换；命令随状态同步；复制操作必须反馈结果
- Environment constraints: Node.js 18+；现代浏览器；支持 390px 手机、平板和桌面
- Primary journey: 选择一个场景 → 调整生成模式/格式/比例 → 观察世界层变化 → 复制真实 Arnis CLI 命令 → 查看源码证据
- User-defined phases: 新建子项目；获取 Arnis；展示能力
- Required artifacts: 上游源码快照、研究 README、交互 Demo、源码同步脚本、构建脚本、封面、验证记录、总目录条目
- Autonomy authorization: 用户明确要求“新建子项目，获取该库，展示该库的能力”；允许直接实现全部可逆的项目内工作
- User-decision boundary: 不发布、不提交、不调用真实生成服务；若需要真实生成世界或外部部署，需另行确定目标区域与输出环境
- Observable completion criteria: 上游仓库存在且 commit 可读；Demo 可运行；主要控制影响预览和命令；桌面/平板/390px 无关键遮挡；键盘可达；构建和目录校验通过

## Coverage record

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一动作 |
| --- | --- | --- | --- | --- | --- | --- |
| 新建子项目 | 独立 070 目录与研究材料 | 文件系统 | 文件清单 | 0/9 | pass | 已创建项目、封面、说明与验证记录 |
| 获取 Arnis | 当前 main 浅克隆 | source/arnis | commit、clean status、cargo metadata/check/help | 1/9 | pass | `3384d3e0` / 3.1.0 验证通过 |
| 展示能力 | 可交互首屏 | 桌面明暗主题 | 浏览器截图与场景、图层、能力、命令交互 | 2–6 | pass | 展示页已保留在浏览器中 |
| 展示能力 | 响应式与键盘 | 1280 / 820 / 390px | 浏览器截图与 AX 状态 | 7 | pass | 无关键遮挡，方向键页签可用 |
| 展示能力 | reduced-motion 与无外部资产回退 | CSS / 静态运行 | CSS 媒体查询、零外部资源与本地 SVG | 8 | pass | 运动降级与离线视觉资产已实现 |
| 交付 | 构建、目录和文档 | CLI / 文件 | build、catalog:check、pages:build | 9 | pass | 构建与总目录检查通过 |
