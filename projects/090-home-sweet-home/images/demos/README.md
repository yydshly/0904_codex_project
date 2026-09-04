# 演示媒体包

这组媒体用于远端 README 快速说明原库能力与衍生能力。画面由本仓库页面在本地浏览器中自动操作录制，不包含外部视频或音频素材。

| 演示 | README 动图 | 高清视频 | 封面 | 字幕 | 原始录制 |
| --- | --- | --- | --- | --- | --- |
| 四态空间 Morph | `garden-demo.gif` | `garden-demo.mp4` | `garden-cover.png` | `garden-demo.vtt` | `garden-demo-source.webm` |
| 智能仓储履约 | `warehouse-demo.gif` | `warehouse-demo.mp4` | `warehouse-cover.png` | `warehouse-demo.vtt` | `warehouse-demo-source.webm` |

## 录制内容

- Garden：花园 → 客厅 → 餐厅 → 卧室 → 夜景，展示对象换形、变换编排、材质权重和光照过渡。
- Warehouse：入库 → 上架 → 拣选 → 出库，展示同一业务状态同步驱动镜头、货流、设备、KPI 和说明。

## 重新生成

先从仓库根目录启动页面：

```powershell
python -m http.server 4190 --directory projects/090-home-sweet-home/demo
```

另开终端执行：

```powershell
cd projects/090-home-sweet-home/scripts
npm install
npx playwright install chromium
npm run record -- http://127.0.0.1:4190
```

脚本要求 `ffmpeg` 可从 `PATH` 调用。也可以通过 `DEMO_FFMPEG_PATH`、`DEMO_CHROME_PATH` 和 `DEMO_PLAYWRIGHT_PATH` 指定本机已有工具。录制使用 1200×675 视口；发布 GIF 缩放为 900px 宽、10fps、96 色，MP4 使用 H.264/yuv420p 且启用 faststart。

## 发布说明

- GIF 负责在 GitHub README 内快速理解，不替代交互页面。
- MP4 保留较清晰的文字与过渡，可下载或用于外部介绍。
- 页面无旁白和配乐；VTT 字幕只描述每个阶段证明的能力。
- 原始 WebM 用于后续重新裁剪，正式替换页面或交互节奏后应重新录制。
