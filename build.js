const fs = require("fs");
const chalk = require("chalk");

// 加载清洗好的数据
const originalData = JSON.parse(fs.readFileSync("./anime_data.json", "utf-8"));
const animeData = originalData.filter(
  (item) =>
    item.airDate &&
    item.airDate > "2026-01-01" &&
    item.metaTags &&
    !item.metaTags.includes("剧场版"),
);
/**
 * 定义卡片模板
 */

const renderCard = ({
  title,
  cover,
  score,
  airDate,
  wish,
  summary,
  id,
  director,
  music,
  aniSongPerformers,
  metaTags,
  origin,
  studio,
  officialSite,
  pvSearchKeywords,
  originTitle,
}) => {
  // 1. 预处理：彻底清理异常字符并截断简介
  const cleanSummary = (summary || "")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .trim();

  // 2. 构造外部链接
  const bgmLink = `https://bgm.tv/subject/${id}`;
  const pvLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(pvSearchKeywords)}`;

  // 合并 origin 和 metaTags，生成用于筛选的数据属性
  const allTags = [];
  if (origin) allTags.push(origin);
  if (metaTags && metaTags.length) allTags.push(...metaTags);
  const uniqueTags = Array.from(new Set(allTags.filter(t => t))).join("|");

  return `
    <div class="card" 
         data-wish="${wish}" 
         data-score="${score}"
         data-origin="${origin || ""}"
         data-tags="${uniqueTags}">
        
        <div class="poster-wrapper">
            <img class="poster" src="${cover}" loading="lazy" alt="${title}">
            <div class="score-badge">★ ${score}</div>
        </div>

        <div class="info">
            <h3 class="title" title="${title}">
                <span class="title-cn">${title}</span>
                <span class="title-jp">${originTitle}</span>
            </h3>
            
            <div class="meta">
                <span>📅 ${airDate || "未知"}</span>
                <span>🔥 ${wish} 人想看</span>
            </div>

            <div class="staff-info">
                <p><strong>监督:</strong> ${director || "未知"}</p>
                ${music && music !== "未知" ? `<p><strong>音乐:</strong> ${music}</p>` : ""}
                ${aniSongPerformers && aniSongPerformers !== "未知" ? `<p><strong>主题歌演出:</strong> ${aniSongPerformers}</p>` : ""}
            </div>

            <p class="summary">${cleanSummary}...</p>
                <div class="tags">
                                ${(() => {
                                    const merged = [];
                                    if (origin) merged.push(origin);
                                    if (metaTags && metaTags.length) merged.push(...metaTags);
                                    const tags = Array.from(new Set(merged.filter(t => t!==undefined))).slice(0, 8);
                                    if (studio) merged.push(studio);
                                    return tags.map(tag => `<span class="tag meta-tag">${tag}</span>`).join("");
                                })()}
                </div>
            <div class="resource-links">
                <a href="${pvLink}" target="_blank" title="搜索 PV">🎬 PV</a>
                <a href="${officialSite}" target="_blank" title="官方网站">🌐 官网</a>
                <a href="${bgmLink}" target="_blank" title="Bangumi 页面">📺 Bangumi</a>
            </div>
        </div>
    </div>`;
};

/**
 * 提取所有 origin 和 tags 用于生成筛选按钮
 */
const allOrigins = new Set();
const allTags = new Set();

animeData.forEach(item => {
  if (item.origin) allOrigins.add(item.origin);
  if (item.metaTags && item.metaTags.length) {
    item.metaTags.forEach(tag => {
      if (tag) allTags.add(tag);
    });
  }
});

const originsArray = Array.from(allOrigins).sort();
const tagsArray = Array.from(allTags).sort();

/**
 * 拼装完整页面
 */
const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>2026 年 1月 新番导视</title>
    <link rel="stylesheet" href="style.css">
    <style>
        /* 新增控制栏样式 */
        header { display: flex; flex-direction: column; gap: 15px; }
        header h1 { margin: 0; }
        header .header-bottom { display: flex; flex-direction: column; gap: 15px; }
        .controls { display: flex; flex-direction: column; gap: 15px; padding: 20px; background: var(--card); border-radius: 12px; }
        .controls > div { text-align: left; }
        .controls strong { display: block; margin-bottom: 8px; }
        .filter-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-btn { padding: 6px 14px; border: none; background: #334155; color: #94a3b8; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .filter-btn.active { background: var(--accent); color: var(--bg); font-weight: bold; }
        .sort-group { display: flex; justify-content: flex-end; }
        .sort-group select { padding: 8px; background: var(--card); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer; }
        .summary { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            header { gap: 12px; }
            header h1 { font-size: 1.8rem; }
            header .header-bottom { gap: 12px; }
            .controls { gap: 12px; padding: 15px; }
            .controls > div { margin-bottom: 0; }
            .controls strong { margin-bottom: 6px; font-size: 0.95rem; }
            .filter-group { gap: 6px; }
            .filter-btn { padding: 5px 10px; font-size: 0.85rem; }
            .sort-group select { padding: 6px; font-size: 0.9rem; }
        }
        
        @media (max-width: 480px) {
            body { padding: 1rem; }
            header h1 { font-size: 1.5rem; }
            .controls { gap: 10px; padding: 12px; }
            .controls strong { font-size: 0.9rem; }
            .filter-btn { padding: 4px 8px; font-size: 0.8rem; }
            .filter-group { gap: 5px; }
            .sort-group select { width: 100%; padding: 6px; font-size: 0.85rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>2026 年 1 月 新番导视</h1>
            <div class="header-bottom">
                <div class="controls">
                    <div>
                        <strong>出处筛选</strong>
                        <div class="filter-group" id="origin-filter">
                            <button class="filter-btn active" data-filter="all">全部</button>
                            ${originsArray.map(origin => `<button class="filter-btn" data-filter="${origin}">${origin}</button>`).join("")}
                        </div>
                    </div>
                    <div>
                        <strong>标签筛选</strong>
                        <div class="filter-group" id="tag-filter">
                            <button class="filter-btn active" data-filter="all">全部</button>
                            ${tagsArray.map(tag => `<button class="filter-btn" data-filter="${tag}">${tag}</button>`).join("")}
                        </div>
                    </div>
                </div>
                <div class="sort-group">
                    <select id="sort-select">
                        <option value="wish">按关注度 (想看人数)</option>
                        <option value="score">按评分排序</option>
                    </select>
                </div>
            </div>
        </header>

        <main class="anime-grid">
            ${animeData.map(renderCard).join("")}
        </main>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const cards = Array.from(document.querySelectorAll('.card'));
            const originFilterBtns = document.querySelectorAll('#origin-filter .filter-btn');
            const tagFilterBtns = document.querySelectorAll('#tag-filter .filter-btn');
            const sortSelect = document.getElementById('sort-select');

            let selectedOrigin = 'all';
            let selectedTag = 'all';

            // 统一筛选函数
            const applyFilters = () => {
                cards.forEach(card => {
                    const origin = card.dataset.origin;
                    const tags = card.dataset.tags ? card.dataset.tags.split('|') : [];
                    
                    const originMatch = selectedOrigin === 'all' || origin === selectedOrigin;
                    const tagMatch = selectedTag === 'all' || tags.includes(selectedTag);
                    
                    card.style.display = (originMatch && tagMatch) ? 'flex' : 'none';
                });
            };

            // Origin 筛选
            originFilterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    originFilterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedOrigin = btn.dataset.filter;
                    applyFilters();
                });
            });

            // Tag 筛选
            tagFilterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    tagFilterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedTag = btn.dataset.filter;
                    applyFilters();
                });
            });

            // 排序逻辑
            const performSort = () => {
                const sortBy = sortSelect.value;
                const visibleCards = cards.filter(card => card.style.display !== 'none');
                visibleCards.sort((a, b) => {
                    const valA = parseFloat(a.dataset[sortBy]) || 0;
                    const valB = parseFloat(b.dataset[sortBy]) || 0;
                    return valB - valA;
                }).forEach((card, index) => {
                    card.style.order = index; 
                });
            };
            
            performSort();
            sortSelect.addEventListener('change', performSort);
        });
    </script>
</body>
</html>
`;

try {
  fs.writeFileSync("./index.html", htmlTemplate);
  console.log(
    chalk.bgGreen.black("\n ✨ index.html 构建成功！双击即可预览极致性能。 \n"),
  );
} catch (err) {
  console.error(chalk.red("构建失败:"), err);
}
