# 图片说明

## `cover.svg`

- 类型：研究项目封面与模块化架构概览图。
- 来源：本研究依据 ego-lite 仓库版本 `5ca3c36cba2240b8df2e22ba32127747029039d5` 和官方文档自行绘制，不是原项目截图。
- 许可：随本研究仓库使用；所研究的开源 SDK 与 Agent Skill 采用 MIT 许可证，ego lite 浏览器应用不在开源仓库内。
- 内容描述：用户任务由 Codex / Claude 等 Agent 转换为操作计划；`ego-browser`、Playwright、Puppeteer 同属浏览器控制 SDK 层，共同遵循“高级 API—控件定位—协议指令—浏览器执行”的原理。其中 `ego-browser` 额外提供语义快照、登录态复用、Space 隔离和人机接管，再通过 ego lite 定制 Chromium 操作真实网站。
- 证据边界：图中的组件关系来自开源 Runtime 调用侧与官方文档；闭源浏览器内核和原生桥接的内部实现未独立验证。
