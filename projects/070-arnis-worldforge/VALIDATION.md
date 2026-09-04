# Validation

本文件记录交付前的验证证据；日期按本地工作区时间计算。

## Source

- [x] 上游仓库存在于 `source/arnis`
- [x] `main` 跟踪 `origin/main`
- [x] 快照提交：`3384d3e042e105247df737968f02c481c142d866`
- [x] `cargo metadata --no-deps --format-version 1`
- [x] `cargo check --no-default-features`（通过；16 条上游未使用代码/导入警告）
- [x] `cargo run --no-default-features -- --help`（通过；CLI 报告 3.1.0）

## Showcase

- [x] `npm run sync`
- [x] `npm run build`
- [x] JavaScript 语法检查
- [x] 桌面视口浏览器检查
- [x] 820px 平板视口浏览器检查
- [x] 390 × 844 手机视口浏览器检查
- [x] 明暗主题检查
- [x] 场景、图层、能力卡、CLI 联动与复制反馈检查
- [x] 能力页签方向键导航检查
- [x] 浏览器控制台无 warning / error

## Notes

- 世界预览是合成能力示意，不是 Arnis 真实生成结果。
- 命令实验室不发起网络请求；复制后需在 `source/arnis` 中执行。
- 真实世界生成需要目标区域的数据下载，未作为本地静态展示的验收前提。
- 总目录 `npm run catalog:check` 通过；根站 `npm run pages:build` 当前收录 10 个项目。
