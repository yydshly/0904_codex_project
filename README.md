# GitHub 优秀项目研究库

这里集中整理近期遇到的优秀 GitHub 项目，记录它们解决的问题、关键设计、实现思路、可复用经验与实际验证结果。

仓库既是研究档案，也是导航入口：根目录 README 提供摘要和有序索引；每个子项目保留独立研究笔记、图片说明与相关材料；需要交互展示的项目可以链接到各自的在线 Demo。

## 项目索引

<!-- PROJECT_INDEX_START -->

> 暂无已收录项目。添加第一个项目后运行 `npm run catalog:update`，索引会自动生成。

<!-- PROJECT_INDEX_END -->

## 仓库结构

```text
.
├─ catalog/projects.json       # 项目顺序与摘要的唯一数据源
├─ projects/                   # 按 001、002……编号的研究目录
│  └─ _template/               # 新项目模板
├─ docs/                       # GitHub Pages 总览站点
├─ scripts/catalog.mjs         # 校验目录并同步 README / Pages 数据
└─ .github/workflows/          # 索引检查与 Pages 部署
```

## 收录一个新项目

1. 复制 `projects/_template` 为 `projects/NNN-project-slug`，例如 `projects/001-react`。
2. 完成该目录中的 `README.md`，并把封面放到 `images/cover.webp`（也支持 `.png`、`.jpg` 或 `.svg`）。
3. 在 `catalog/projects.json` 添加记录；`order` 必须唯一并与目录编号一致。
4. 运行 `npm run catalog:update` 生成根目录索引和 Pages 数据。
5. 运行 `npm run catalog:check` 做提交前检查。

项目状态统一使用：`queued`（待研究）、`researching`（研究中）、`published`（已发布）、`archived`（已归档）。

更详细的写作、图片和命名约定见 [projects/README.md](projects/README.md)。

## 在线展示

`docs/` 是零依赖的静态索引站点。推送到 `main` 后，GitHub Actions 会检查目录并发布 GitHub Pages。首次使用时，需要在仓库的 **Settings → Pages → Build and deployment** 中将 Source 设为 **GitHub Actions**。

每个子项目可以把 Demo 部署到任意地址，再将 URL 写入 `catalog/projects.json` 的 `demo` 字段；总览页会自动展示入口。
