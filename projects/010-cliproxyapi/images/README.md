# 图片说明

## `proxy-platform-overview.png`

- 类型：宏观原理架构图，同时作为 README 首图和项目索引封面。
- 目的：用三栏结构说明调用方、内部代理平台与真实上游之间的关系，并并列展示 API Key 与 OAuth/Auth 两种代理方式。
- 来源：本研究库原创；根据本项目源码研究和 OAuth/凭证调度实验整理。
- 生成方式：以原有详细架构图为视觉参考，通过 OpenAI 内置图片生成能力制作评审稿，经用户确认后保存到项目。
- 许可：随本研究库使用。

文字描述：我们的代码、Agent 或 CLI 通过 OpenAI 兼容 API 调用内部代理平台。平台依次经过统一协议入口、协议与模型适配、凭证运行时和 Provider Executor。随后选择两种凭证路径之一：注入配置好的官方 API Key，或使用浏览器授权和 Callback 沉淀的 OAuth/Auth；两条路径最终请求模型提供方，并把统一响应返回调用方。

## `cover.svg` / `cover.png`

- 类型：整体架构图，同时作为项目封面；SVG 是可编辑源文件，PNG 是用于 README 和索引展示的渲染版本。
- 来源：本研究库原创；依据 CLIProxyAPI `v7.2.149`、commit `2a6b87aca083a5bf498ac1f68a1b636c500d7aaa` 的源码结构绘制。
- 生成方式：手工整理源码模块和请求链路后，以 SVG 绘制，再以 2× 分辨率渲染为 PNG；未复制上游图片素材。
- 许可：随本研究库使用。

文字描述：左侧是使用 OpenAI、Claude、Gemini 与 Codex 协议的客户端；请求进入中间的 API 网关，依次经过兼容路由、协议转换和插件钩子、模型路由与多凭据调度、Provider Executor；右侧是 OpenAI/Codex、Anthropic、Google、xAI/Kimi 及 OpenAI 兼容上游。上游响应经过响应转换层，以 JSON、SSE 或 WebSocket 形式回到原客户端。底部控制面由配置热更新、OAuth/API Key 凭据库、Management API/控制台和插件 SDK 组成。上游限流、配额与错误会反馈给调度层，触发冷却、重试和故障转移。
