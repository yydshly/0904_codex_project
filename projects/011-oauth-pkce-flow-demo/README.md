# OAuth + PKCE 本地交互演示

这个子项目用两个本地 HTTP 服务模拟 CLIProxyAPI 的 Codex 登录和调用流程，不连接 OpenAI，不需要真实账号，产生的 Token 全是假数据。

它是 [CLIProxyAPI 在线知识页](https://yydshly.github.io/0904_codex_project/projects/010-cliproxyapi/demo/) 的后端实验版：在线页适合快速回顾“统一协议网关 + 凭证运行时”和两种代理方式；本地版用于观察真实 HTTP Redirect、Callback、Token 交换与刷新。

首页同时是一份可操作的实现参考，内容包括：

- OAuth、OIDC、Authorization Code 和 PKCE 的职责边界。
- 浏览器、Callback、认证服务器和代码之间的 HTTP 交接。
- `state`、PKCE、Code、Token、业务租户和 Session 的不同关联。
- Auth 对象包含的认证数据与运行时调度状态。
- Agent CLI、业务鉴权、Auth Manager、Selector 和 Executor 的责任划分。
- 官方 API、BYOK、OAuth、云身份和 Cookie 模拟等中转模式。
- 本机 Callback、公网 HTTPS Callback 和 Device Flow 的部署选择。
- 生产实现所需的数据模型、安全控制、错误反馈与可观测性清单。

## 启动

```powershell
cd E:\0904_codex_project\projects\011-oauth-pkce-flow-demo
go run .
```

然后打开：

```text
http://127.0.0.1:18080
```

- `18080`：模拟我们的代码、OAuth Client 和 CLIProxyAPI 网关。
- `18081`：模拟 `auth.openai.com` 和 Codex 上游。
- `data/codex-demo-auth.json`：模拟登录成功后保存的 Auth 凭证。

## 建议操作顺序

1. 点击“开始授权登录”。
2. 注意浏览器从 `18080` 跳转到了 `18081/authorize`。
3. 点击“登录并允许”。
4. 注意浏览器被认证服务器重定向到 `18080/callback?code=...&state=...`。
5. 查看页面展示的 Auth JSON。
6. 返回首页，点击“调用模拟 Codex”。
7. 点击“令 Access Token 过期”，再次调用，观察 `401`。
8. 点击“使用 Refresh Token”，再调用一次。

## 对应真实 CLIProxyAPI

| 演示组件 | 真实组件 |
|---|---|
| `GET /login` | `CodexAuthenticator.Login()` |
| `18081/authorize` | `https://auth.openai.com/oauth/authorize` |
| `18080/callback` | `http://localhost:1455/auth/callback` |
| `18081/token` | `https://auth.openai.com/oauth/token` |
| `data/codex-demo-auth.json` | CLIProxyAPI 的 Codex Auth JSON |
| `18081/codex/responses` | `https://chatgpt.com/backend-api/codex/responses` |

关键边界：浏览器只运输一次性的 `code`；业务代码持久化并使用的是 `access_token` 和 `refresh_token`，并不读取浏览器 Cookie。

## 页面阅读路径

1. `交互实验台`：亲自完成授权、Callback、调用、过期和刷新。
2. `本质原理`：理解浏览器只是 User Agent，Callback 是代码的 HTTP 接口。
3. `如何关联`：理解 `state`、PKCE 和授权码分别防止什么问题。
4. `Auth 对象` 与 `凭证调度`：理解登录凭证如何进入运行时调度。
5. `中转模式` 与 `部署选择`：判断不同方案的适用边界。
6. `实现蓝图`：作为后期数据库、接口、调度和安全设计的起点。

前端交付和验证记录见 [docs/frontend-delivery.md](docs/frontend-delivery.md)。
