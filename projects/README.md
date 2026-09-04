# 子项目约定

## 目录命名

研究目录使用 `NNN-project-slug` 格式：

- `NNN` 是三位顺序号，例如 `001`、`020`。
- `project-slug` 使用小写英文、数字和连字符。
- 编号需要与 `catalog/projects.json` 中的 `order` 一致。
- 建议初期以 10 为间隔编号（`010`、`020`、`030`），为后续插入项目留出空间；展示时仍按数字升序排列。

## 每个项目应包含

```text
projects/NNN-project-slug/
├─ README.md
└─ images/
   ├─ cover.webp
   └─ README.md
```

研究笔记至少回答：项目解决什么问题、为什么值得研究、关键设计是什么、如何运行、有哪些可复用经验，以及它的局限或适用边界。

## 图片约定

- 封面固定命名为 `cover.webp`；也接受 `.png`、`.jpg`、`.jpeg` 或 `.svg`。
- 过程图按出现顺序命名，例如 `01-architecture.png`、`02-main-flow.webp`。
- README 中的每张图片都应提供有意义的替代文本，不使用“图片”“截图”这类空泛描述。
- 在 `images/README.md` 记录图片来源、许可信息、拍摄或生成方式，以及一段不依赖图片也能理解的文字描述。
- 不直接提交来源不明或授权不清晰的图片。

## 索引字段

`catalog/projects.json` 中的每条记录格式如下：

```json
{
  "order": 10,
  "slug": "project-slug",
  "name": "项目名称",
  "repository": "https://github.com/owner/repository",
  "summary": "一句话说明它解决的问题与研究价值。",
  "status": "researching",
  "cover": "projects/010-project-slug/images/cover.webp",
  "demo": "https://example.com",
  "tags": ["TypeScript", "Web"]
}
```

`demo` 可以留空；其他字段为必填。`cover` 必须指向仓库内实际存在的图片。
