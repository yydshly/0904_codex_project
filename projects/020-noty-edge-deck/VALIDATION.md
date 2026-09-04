# Edge Deck 验证记录

## 可复现环境

- 启动命令：`python -m http.server 4173`
- 工作目录：`E:\0904_codex_project\projects\020-noty-edge-deck\demo`
- 规范 URL：<http://127.0.0.1:4173>
- 浏览器：Codex 内置 Chromium 浏览器（真实页面运行）
- 验证日期：2026-09-05

## 覆盖状态

| 检查项 | 环境 / 状态 | 预期证据 | 状态 |
| --- | --- | --- | --- |
| 页面基线 | 1280 × 720 桌面浅色，rest | 页面与入口完整；无横向溢出、错误层或控制台错误 | pass |
| 主交互 | 桌面，rest → fan → expanded → fan → rest | 卡组和编辑纸张按状态出现；关闭与两次 Escape 均逐层恢复 | pass |
| 编辑保存 | expanded | 输入后依次显示“保存中”“已保存”；刷新后标题仍存在 | pass |
| 置顶恢复 | expanded + pin | 置顶后点击背景保持展开；取消置顶后可关闭 | pass |
| 主题 | 浅色 ↔ 深色 | 两个方向均保持纸张、工作台和正文的对比度 | pass |
| 平板 | 768 × 900 | 页面宽度与视口一致，无横向溢出；右侧入口完整 | pass |
| 手机 | 390 × 844，底部托盘 | rest、fan、expanded 均可操作；卡组不被悬停计时器误收起 | pass |
| 键盘 | Tab、Enter、Escape | 胶囊 → 卡签 → 标题的焦点路径成立；Escape 将焦点恢复到卡签和胶囊 | pass |
| reduced-motion | `?motion=reduce` | 动画与过渡约为 0ms；内容和操作仍完整 | pass |
| 工程检查 | 目录、索引、Pages 构建 | JavaScript 语法、目录索引、Pages 构建均通过 | pass |

## 修订 2：页面、Windows 逻辑与业务场景

| 用户阶段 | 环境 / 状态 | 实际证据 | 状态 |
| --- | --- | --- | --- |
| 优化网页版本 | 1440 × 900，浅色，rest/fan | 首屏按钮可打开 fan 并把焦点送到第一张卡签；卡签计算样式为 `vertical-rl + upright + transform:none` | pass |
| 优化网页版本 | 1440 × 900，深色 | 首屏、Windows 架构、业务场景和路线文字均保持可读，卡片边界与状态色一致 | pass |
| 优化网页版本 | 768 × 900 | 架构卡转换为两列；顶部导航和边缘入口完整；无横向溢出 | pass |
| 优化网页版本 | 390 × 844 | 内容转换为单列，首屏按钮全宽，底部托盘、expanded 纸张与背景遮罩均可操作；无横向溢出 | pass |
| Windows 实现逻辑 | 1440 × 900，`#windows` | 页面呈现 4 层架构、3 个窗口状态、多屏定位、触发策略、能力边界及官方依据 | pass |
| 业务使用场景 | 1440 × 900，`#scenarios` | 捕获、召回、关注、轻操作 4 类卡片和三问判断法完整呈现 | pass |
| 业务扩展场景 | 1440 × 900，`#roadmap` | P0–P3 四阶段路线与 10 类可扩展卡片完整呈现 | pass |
| 键盘恢复 | 390 × 844，rest → fan → expanded → fan → rest | Enter 打开卡组和便签；第一次 Escape 回卡签，第二次页面级 Escape 回胶囊 | pass |
| reduced-motion | 390 × 844，`?motion=reduce#roadmap` | HTML 滚动为 `auto`，按钮过渡和提示动画约为 0ms，锚点内容直接到位 | pass |

## 精修记录

| 发现 | 调整 | 复验结果 | 状态 |
| --- | --- | --- | --- |
| rest 状态的隐藏编辑器仍进入辅助技术树 | 为面板同步设置 `aria-hidden` 与 `inert` | rest 只暴露边缘入口，展开后编辑控件恢复 | pass |
| 重叠卡片的整页按钮彼此覆盖，早期卡签点击不稳定 | 把点击面收敛为 62px 卡签，纸张延伸改由非交互伪元素绘制 | 任一卡签均可稳定打开对应便签 | pass |
| 深色主题的工作台正文继承了页面外层颜色 | 在主题容器建立前景色继承边界 | 深色模式标题、正文和辅助信息均可读 | pass |
| 手机端场景容器和页面同时滚动，且桌面 pointerleave 会让托盘误收起 | 手机端只保留页面纵向滚动，并在触屏/窄屏禁用悬停收起计时器 | 390px 下单滚动条，fan 可持续操作 | pass |
| 从 fan 退出时焦点仍尝试回到已隐藏卡签 | 按目标状态区分焦点恢复：fan 回卡签，rest 回胶囊 | 两次 Escape 后焦点落在可见边缘入口 | pass |
| 中文卡签同时使用竖排和 180° 旋转，导致阅读方向反转 | 保留 `vertical-rl`，改用 `text-orientation: upright` 并移除旋转 | “发布检查”等标题从上到下正常阅读，移动端仍为横排 | pass |
| 极窄边缘入口不易被首次访问者发现 | 首屏增加“立即体验卡组”按钮并直接聚焦第一张卡签 | 鼠标和键盘都能从显式入口进入 fan | pass |
| 原场景容器禁止纵向溢出，无法承载新增说明内容 | 保留横向裁切，允许页面纵向滚动，并增加粘性锚点导航 | 5231px 长页面可完整滚动且无横向溢出 | pass |
| 锚点跳转时已打开的 fan 可能继续覆盖说明区 | 页面内锚点跳转时将 fan 恢复为 rest | Windows、业务和路线区跳转后只保留窄胶囊 | pass |
| 胶囊在焦点恢复后可能因 focus/pointerenter 再次展开 | 键盘改为聚焦后按 Enter 打开；触屏禁用 hover 触发，并抑制恢复动画期间的误开启 | 页面级第二次 Escape 后保持 rest，焦点回到胶囊 | pass |
| 新增平滑锚点滚动未被测试用 reduced-motion 钩子覆盖 | 同步把 motion 状态写入 `html` 并覆盖根滚动行为 | 查询参数模式下滚动为 `auto`，动画与过渡约为 0ms | pass |

## 工程证据

- `node --check demo/app.js`
- HTML 结构检查：29 个唯一 ID，CSS 与 JavaScript 入口文件存在。
- `npm run catalog:check`
- `npm run pages:build`
- README 页面效果图在 1600 × 1000 浏览器视口中由实际页面渲染生成，截图时卡组处于 Expanded 状态。
- 浏览器日志检查结果：0 条 error，0 条 warning。
