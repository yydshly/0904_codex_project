# Edge Deck 设计契约

- Entry mode：参考实现（reference-led）+ 范围修订（revision-led）
- Request revision：2
- Target user and context：希望先在网页理解交互、再判断是否值得在 Windows 电脑上安装的产品、设计和开发人员。
- Desired first impression：首屏仍然安静、轻盈且可立即体验；继续阅读时，Windows 的实现边界、业务价值与扩展路线清楚可信。
- Visual ambition：Editorial
- Experience architecture：Hybrid Workspace
- Visual constraints：保留 Noty 的“边缘胶囊、层叠卡签、拉出便签”核心空间关系；修正中文卡签为从上到下的正常阅读顺序；新增内容区继续使用自有深蓝灰工作台、纸张色系和编辑式网格。
- Information constraints：首屏负责体验；页面下方依次说明 Windows 分层实现、窗口状态映射、业务使用场景和扩展路线；README 保留完整研究资料。
- Operation constraints：纯 HTML/CSS/JavaScript；无后端、登录、真实系统快捷键或操作系统窗口能力；数据仅保存在浏览器 localStorage。
- State constraints：至少覆盖 rest、fan、expanded、new-note；支持点击外部和 Escape 恢复；主题切换后保持状态语义。
- Environment constraints：桌面、平板和 390px 手机；桌面支持 hover，触屏使用点击；长页面导航与固定卡组不能互相遮挡；尊重 `prefers-reduced-motion`。
- Primary journey：通过显式按钮或边缘入口体验卡组 → 阅读 Windows 四层实现逻辑与三态窗口映射 → 判断当前业务场景及后续扩展优先级。
- User-defined phases：第一，优化网页版本；第二，在页面中描述 Windows 中的实现逻辑；第三，说明业务使用场景和扩展场景。
- Required artifacts：更新后的 Web Demo、同步后的 README、设计契约、目录索引和验证记录。
- Autonomy authorization：用户明确要求优化页面并补充 Windows 实现逻辑、业务场景和扩展场景，授权直接修改当前子项目和关联索引。
- User-decision boundary：不新增后端、云同步、真实 AI、系统权限或公开部署；这些只作为扩展方向记录。
- Observable completion criteria：中文卡签按从上到下顺序可读；首屏有显式体验入口；页面包含可扫描的 Windows 架构、状态映射、适用场景、边界和扩展路线；桌面、平板、390px 手机、键盘、主题与 reduced-motion 均可用；目录检查和 Pages 构建通过。

## 场景契约

- Scene base：语义化 DOM + CSS。
- Scene persistence：模拟工作台始终留在背景；边缘卡组和便签作为前景层进入、退出。
- Foreground control model：顶部主题与帮助控制；右侧边缘入口；移动端底部入口；打开的便签为可关闭前景层。
- State-to-scene mapping：rest 只显示色点；fan 显示重叠卡签；expanded 将当前卡签和纸张连成一体；new-note 创建并直接展开空白便签。
- Mobile transformation：右侧卡组转换为底部托盘和上推式便签，不退化成长页面。
- Fallback：关闭动画或不支持 hover 时仍可通过按钮、焦点和点击完成全部操作。

## 修订 2 的混合工作区边界

- 场景内动作：展开卡组、打开/编辑便签、置顶、关闭和新建。
- 文档流动作：理解 Windows 宿主、窗口状态、数据安全、业务场景和演进优先级。
- 转场：首屏按钮可以直接打开卡组；锚点导航进入说明区，但边缘入口仍保持可用。
- 移动端：卡组继续变为底部托盘；说明区采用单列卡片与横向可滚动导航，不复制桌面侧边布局。

## 覆盖清单

| 用户阶段 | 要求或产物 | 表面 / 状态 | 证据 | 阶段 | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- | --- |
| 新建子项目 | 研究 README 与独立目录 | 文档 | 文件与目录检查 | 0 / 9 | pass | — |
| 类似效果 | 边缘入口三态交互 | 桌面浅色，rest/fan/expanded | 真实浏览器截图、DOM 状态与操作 | 1–6 | pass | — |
| 类似效果 | 主题语义保持一致 | 桌面深色及双向切换 | 双向切换截图与可读性观察 | 2 / 7 | pass | — |
| 类似效果 | 移动端底部托盘 | 390px，rest/fan/expanded | 真实浏览器截图与操作 | 7 | pass | — |
| 类似效果 | 平板布局无碰撞 | 768px | 768 × 900 截图与溢出检查 | 7 | pass | — |
| 类似效果 | 键盘完成打开、编辑、关闭 | Tab / Enter / Escape | 焦点路径和逐层恢复检查 | 4 / 5 / 7 | pass | — |
| 类似效果 | 降低动态效果 | reduced-motion | `?motion=reduce` 计算样式检查 | 7 / 8 | pass | — |
| 类似效果 | 编辑结果本地保留 | expanded / reload | 保存状态与刷新回读 | 5 / 6 | pass | — |
| 场景与扩展 | 适用场景、边界、路线清晰 | README | 内容检查 | 3 / 9 | pass | — |
| 接入研究库 | 目录与 Pages 数据一致 | catalog / README / Pages | `catalog:check` 与 `pages:build` | 9 | pass | — |
| 封面 | 实际 Demo 页面效果与来源说明 | readme-page-effect.png / images README | 1600 × 1000 浏览器真实渲染检查 | 9 | pass | — |
| 浏览器验收 | 真实运行地址和结果可复现 | 全部要求 | VALIDATION.md | 9 | pass | — |
| 第一：优化网页版本 | 中文卡签方向正确、入口更易发现 | 桌面，rest/fan/expanded | 1440 × 900 截图、计算样式与按钮交互 | 2–5 | pass | — |
| 第一：优化网页版本 | 长页面层级、锚点导航和主题一致 | 浅色/深色，1440/768/390px | 截图、导航与横向溢出检查 | 3 / 7 | pass | — |
| 第二：Windows 逻辑 | 四层架构和窗口三态映射完整 | Windows 说明区 | 4 张架构卡、3 个窗口状态的 DOM 与视觉检查 | 3 / 9 | pass | — |
| 第三：业务场景 | 使用场景、判断标准与不适用边界清晰 | 场景说明区 | 4 类场景、三问判断法与边界的视觉检查 | 3 / 9 | pass | — |
| 第三：扩展场景 | 从卡片类型到上下文和 AI 的路线可扫描 | 扩展路线区 | P0–P3 路线与 10 类扩展卡片的视觉检查 | 3 / 9 | pass | — |
| 修订 2 浏览器验收 | 原有编辑主路径无回归 | 桌面/390px，键盘/Enter/Escape | 真实浏览器操作与焦点状态 | 5 / 7 | pass | — |
| 修订 2 工程验收 | 语法、目录与 Pages 构建一致 | 项目与生成目录 | JS/HTML 检查、`catalog:check`、`pages:build` | 9 | pass | — |
