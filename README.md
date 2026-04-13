# Sentinel Mini（新番导视 / 静态站）

一个基于 **Bangumi (bgm.tv) API** 的新番信息采集与展示小项目：  
- 页面为纯静态 `index.html`，适合部署到 **GitHub Pages**。  
- 数据按“季度（1/4/7/10 月）”分片存储，便于未来扩展到更多季度与多年数据。

## 功能概览

- **展示**：在网页里按番剧卡片展示（支持按“出处/标签”筛选、按“想看/评分”排序）
- **数据分片**：`data/seasons/<YYYY-MM>.json`（例如 `2026-01`、`2026-04`）
- **季度切换**：页面右上角可切换 season（自动默认最新一季）

## 数据来源与说明

- **数据源**：Bangumi 番组计划（bgm.tv）
- **字段**：从 `v0/subjects/:id` 清洗出标题、封面、放送信息、staff、标签、评分、想看等字段
- **注意**：Bangumi 数据本身可能缺字段/日期不规范，因此会有少量条目无法推断季度，被放入 `data/seasons/_unknown.json`

## 目录结构（关键）

```text
data/
  library.json                # 索引：有哪些 seasons、每季数量等
  seasons/
    2026-01.json              # 某一季的数据（season + lastUpdated + items）
    2026-04.json
    _unknown.json             # 无法推断季度的条目
scripts/
  split-data.js               # 将旧的 anime_data.json 拆成按季分片
index.html                    # 静态页面（读取 data/library.json 和 data/seasons/*.json）
anime_data.json               # 旧格式（仍可作为数据源/迁移输入）
index.js                      # 抓取脚本（当前仍输出到 anime_data.json）
update.js                     # 更新脚本（当前仍更新 anime_data.json）
```

## 快速开始（本地查看）

1) 安装依赖

```bash
npm i
```

2) 启动一个静态服务器（任选其一）

```bash
npx serve .
```

或

```bash
npx http-server .
```

然后打开终端提示的地址即可。

## 生成/更新按季分片数据

当前仓库里的 `data/` 是通过把旧的 `anime_data.json` 拆分得到的。  
当你更新了 `anime_data.json` 后，可以再次运行分片脚本生成 `data/`：

```bash
node scripts/split-data.js
```

输出：
- `data/seasons/<YYYY-MM>.json`
- `data/library.json`

## GitHub Pages 部署建议

这是一个 **纯静态站**，推荐流程是：
- 在本地或 GitHub Actions 里跑抓取/更新脚本，生成 `data/` 分片 JSON
- 把生成后的 `data/` 提交到仓库
- GitHub Pages 直接托管静态文件（`index.html` 会读取 `data/`）

> 说明：GitHub Pages 本身不能运行 Node 也不能写数据库文件，所以本项目选择用静态 JSON 作为前端数据源。

## 计划与约定（面向未来扩展）

- 后续建议只抓“当季”数据，并把该季文件的 `lastUpdated` 作为“最后抓取日期”
- 老番（旧季）文件保持不变即可

