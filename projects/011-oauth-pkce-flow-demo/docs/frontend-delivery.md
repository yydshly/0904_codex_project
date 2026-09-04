# Frontend refinement record

## Design contract

```text
Entry mode: Revision-led
Request revision: 2
Target user and context: 中文技术团队，在动手实现 OAuth 凭证代理前通过本地演示建立共同模型
Desired first impression: 先看到“统一协议网关 + 凭证运行时”，再直观理解 API Key 与 OAuth/Auth 两种代理路径
Visual ambition: Functional
Experience architecture: Editorial Flow
Visual constraints: README 首图采用已确认的宏观三栏架构；页面延续浅色/深色自适应；先讲代理平台，再进入 OAuth 细节
Information constraints: 根索引准确使用“统一协议网关 + 凭证运行时”；明确统一 API、适配器、真实 API Key、OAuth/Auth 与两种代理原理
Operation constraints: GitHub Pages 提供纯静态交互说明；本地 Go 版保留登录、Callback、调用、过期、刷新和重置
State constraints: 静态页至少覆盖 API Key/OAuth 两种路径切换；本地版继续覆盖未认证、已认证、过期和刷新
Environment constraints: GitHub Pages 仅静态文件；Go 1.25 标准库本地运行于 18080/18081；不连接真实 OpenAI
Primary journey: 根 README 索引 → 宏观架构图 → 两种代理方式 → 在线静态演示 → 本地 HTTP 实验
User-defined phases: 确认宏观图片；确认直观摘要；写入仓库；提交远端；部署 GitHub Pages
Required artifacts: 架构图片、项目 README、根 README 索引、静态 Pages 页面、本地实验、浏览器与构建证据
Autonomy authorization: 用户回复“确定”，授权按已确认图和摘要完成写入、提交、推送与部署
User-decision boundary: 不接入真实账户；不上传真实 Token；不把其他研究项目纳入本次提交
Observable completion criteria: 根索引文字准确；首屏建立统一网关概念且架构图紧邻其后；两种代理方式清晰可见；桌面/窄屏无横向溢出；静态交互可用；Go 与目录检查通过；Pages 工作流成功且公网地址可访问
```

## Coverage manifest

| User phase | Requirement or artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
|---|---|---|---|---|---|---|
| 宏观图片 | 用三栏图解释调用方、内部代理平台与真实上游 | README / Pages | Image and browser screenshot | 2-3 | pass | `proxy-platform-overview.png` 已进入根 README、项目 README 与 Pages，浏览器确认成功加载 |
| 直观索引 | 使用确认后的“统一协议网关 + 凭证运行时”摘要 | Root README / catalog | File inspection and catalog check | 3 | pass | 根索引和线上项目卡片显示确认摘要，Demo 链接正确 |
| 两种代理方式 | 简述 API Key 注入与 OAuth/Auth 沉淀后调度 | Static Pages | Browser DOM and interaction | 3-6 | pass | 公网页面可切换 API Key/OAuth 路径并逐步查看五个节点 |
| 本地实验 | 保留真实 HTTP Redirect、Callback、Token 与刷新模拟 | Local Go app | Browser journey | 5-6 | pass | 既有 18080/18081 全流程证据继续有效，代码未改变 |
| 响应式 | Pages 桌面与窄屏可读、无文档级横向溢出 | 1280px / 390px | Browser observation | 7 | pass | Playwright 实测两种宽度的 `scrollWidth` 等于 `innerWidth`，窄屏内容重排 |
| 主题 | 浅色/深色由系统 color-scheme 自适应 | Supported theme boundary | CSS/source and browser render | 7 | pass | 1280px 浅色与 390px 深色均已实际渲染，层级与状态可读 |
| 工程质量 | Go、目录、Pages 构建均通过 | Repository | Command output | 9 | pass | gofmt、go test、go build、catalog check、pages build 与 diff check 通过 |
| 发布 | 仅提交本项目范围并部署 GitHub Pages | Git / GitHub Actions | Commit, push, workflow and HTTP | 9 | pass | commit `61737c1` 已推送；Pages run `33890269807` 成功；公网 URL 与交互已验证 |

## Baseline evidence

- Canonical command: `go run .`
- Canonical URL: `http://127.0.0.1:18080/`
- Runtime observed: 2026-09-04, Codex in-app browser
- Baseline state: authenticated; existing experiment controls and Auth fields are functional
- Baseline hierarchy issue: page explains the five operational steps but does not preserve the broader conclusions reached during research, so it cannot yet serve as an implementation reference

## Final evidence

- Published URL: `https://yydshly.github.io/0904_codex_project/projects/010-cliproxyapi/demo/`.
- Published index: `https://yydshly.github.io/0904_codex_project/` 显示确认后的摘要与在线 Demo 入口。
- Static Pages desktop: `1280 × 720` light theme; H1 establishes “统一协议网关 + 凭证运行时”, architecture image loads, and document width is `1280/1280` with no horizontal overflow.
- Static Pages narrow: `390 × 844` dark theme; cards and stages collapse to one column, document width is `390/390`, and long labels remain readable.
- Static interaction: API Key and OAuth/Auth tabs update the five-stage path; Next advances the live status from step 1 to step 2. The same path works on the public Pages URL.
- Keyboard: Enter selects the API Key tab and advances Next; focus remains on `next-step` with the browser focus outline visible.
- Motion: a browser context with `prefers-reduced-motion: reduce` reports `0s` transition duration.
- Browser console: no errors in the desktop-light or mobile-dark scenarios.
- Browser journey: authorization service URL contained Client ID, PKCE challenge, Redirect URI, Scope and state; approval returned to `/callback?code=...&state=...`; expired Access Token returned `access_token_expired`; refresh issued a new token; the next Codex call returned the authenticated demo account.
- Accessibility structure: one H1, ordered H2 topic headings, semantic navigation links, native buttons/forms, native details/summary controls and semantic tables.
- Canonical runtime remains `go run .` at `http://127.0.0.1:18080/`.
- Engineering: `npm run catalog:check`, `npm run pages:build`, `gofmt`, `go test ./...`, `go build .` and Git diff checks passed.
- Deployment: GitHub Actions Pages run `33890269807` completed successfully for commit `61737c1`.

## Terminal audit

- No coverage row remains `continue`.
- Architecture image, root/project README, static Pages page, local HTTP experiment and validation record all exist.
- No item remains deferred or blocked.
- No blocked item remains in the requested scope.
