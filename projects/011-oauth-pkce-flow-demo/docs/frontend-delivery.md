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
Observable completion criteria: 根索引文字准确；图片和两种代理方式首屏可见；桌面/窄屏无横向溢出；静态交互可用；Go 与目录检查通过；Pages 工作流成功且公网地址可访问
```

## Coverage manifest

| User phase | Requirement or artifact | Surface / state | Evidence needed | Owning stage | Status | Next action |
|---|---|---|---|---|---|---|
| 宏观图片 | 用三栏图解释调用方、内部代理平台与真实上游 | README / Pages | Image and browser screenshot | 2-3 | continue | 将确认图片保存到项目并接入 README 与静态页 |
| 直观索引 | 使用确认后的“统一协议网关 + 凭证运行时”摘要 | Root README / catalog | File inspection and catalog check | 3 | continue | 更新 catalog 并生成根 README 索引 |
| 两种代理方式 | 简述 API Key 注入与 OAuth/Auth 沉淀后调度 | Static Pages | Browser DOM and interaction | 3-6 | continue | 构建静态双路径切换与详细参考页 |
| 本地实验 | 保留真实 HTTP Redirect、Callback、Token 与刷新模拟 | Local Go app | Browser journey | 5-6 | pass | 既有 18080/18081 全流程证据继续有效，代码未改变 |
| 响应式 | Pages 桌面与窄屏可读、无文档级横向溢出 | 1024px / 390px | Browser observation | 7 | continue | 部署前检查本地 Pages 构建，部署后复核公网页面 |
| 主题 | 浅色/深色由系统 color-scheme 自适应 | Supported theme boundary | CSS/source and browser render | 7 | continue | 静态页实现主题适配并检查可用环境 |
| 工程质量 | Go、目录、Pages 构建均通过 | Repository | Command output | 9 | continue | 运行 gofmt、go test、go build、catalog check 和 pages build |
| 发布 | 仅提交本项目范围并部署 GitHub Pages | Git / GitHub Actions | Commit, push, workflow and HTTP | 9 | continue | 精确暂存、推送 main、等待 Pages 成功并验证 URL |

## Baseline evidence

- Canonical command: `go run .`
- Canonical URL: `http://127.0.0.1:18080/`
- Runtime observed: 2026-09-04, Codex in-app browser
- Baseline state: authenticated; existing experiment controls and Auth fields are functional
- Baseline hierarchy issue: page explains the five operational steps but does not preserve the broader conclusions reached during research, so it cannot yet serve as an implementation reference

## Final evidence

- Desktop viewport: `1024 × 768`; sticky topic navigation, experiment cards and authenticated Auth summary visible without document-level horizontal overflow.
- Narrow viewports: `390 × 844` and the default `319px` browser width; content grids collapse to one column, long source paths wrap, and topic navigation/tables keep overflow inside their own containers; document-level horizontal overflow absent.
- Browser journey: authorization service URL contained Client ID, PKCE challenge, Redirect URI, Scope and state; approval returned to `/callback?code=...&state=...`; expired Access Token returned `access_token_expired`; refresh issued a new token; the next Codex call returned the authenticated demo account.
- Accessibility structure: one H1, ordered H2 topic headings, semantic navigation links, native buttons/forms, native details/summary controls and semantic tables.
- Supported theme boundary: CSS follows the host light/dark color scheme. Current light rendering was observed. Browser capabilities exposed viewport control but no color-scheme/media emulation, so dark rendering remains a valid non-blocking defer; retest when browser media emulation or a dark host session is available.
- Canonical runtime remains `go run .` at `http://127.0.0.1:18080/`.

## Terminal audit

- No coverage row remains `continue`.
- Required webpage, README and validation record exist.
- The only defer is dark-theme browser evidence; it does not block the requested content and interaction delivery, and includes an explicit retest trigger above.
- No blocked item remains in the requested scope.
