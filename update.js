const fs = require('fs');
const path = require('path');

const LEGACY_FILE = './anime_data.json';
const UA = 'Ayasen-Anime-Sentinel/1.0'; // 规范的 User-Agent 避免被封

function getLatestSeasonFileFromLibrary() {
    const libraryPath = path.join(__dirname, 'data', 'library.json');
    if (!fs.existsSync(libraryPath)) return null;

    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
    const seasons = Array.isArray(library.seasons) ? library.seasons.slice() : [];
    if (!seasons.length) return null;

    // season key 形如 2026-04，字典序即可代表时间序
    seasons.sort().reverse();
    const latest = seasons[0];
    return path.join(__dirname, 'data', 'seasons', `${latest}.json`);
}

function resolveTargetFile() {
    const legacyPath = path.join(__dirname, 'anime_data.json');
    if (fs.existsSync(legacyPath)) return legacyPath;

    const latestSeasonFile = getLatestSeasonFileFromLibrary();
    if (latestSeasonFile && fs.existsSync(latestSeasonFile)) return latestSeasonFile;

    return null;
}

async function updateAll() {
    try {
        const targetFile = resolveTargetFile();
        if (!targetFile) {
            console.error('❌ 未找到可更新的数据文件（anime_data.json 或 data/seasons/<latest>.json）');
            return;
        }

        const rawData = fs.readFileSync(targetFile, 'utf8');
        let json = JSON.parse(rawData);
        
        // 智能识别数据格式：如果已经包装过，提取 items；否则直接使用
        let animeList = Array.isArray(json) ? json : (json.items || json);
        
        // 确保 animeList 是数组
        if (!Array.isArray(animeList)) {
            console.error('❌ 数据格式错误：无法找到番剧数组');
            return;
        }

        console.log(`📡 正在为 ${animeList.length} 部番剧同步最新情报...`);

        for (let i = 0; i < animeList.length; i++) {
            let anime = animeList[i];
            if (!anime.id) continue;

            try {
                // 使用官方 V0 接口
                const res = await fetch(`https://api.bgm.tv/v0/subjects/${anime.id}`, {
                    headers: { 'User-Agent': UA }
                });
                
                const info = await res.json();

                if (info.rating) {
                    // 1. 更新评分
                    anime.score = info.rating.score || 0;
                    
                    // 2. 更新想看人数 (wish)
                    if (info.collection) {
                        anime.wish = info.collection.wish || 0;
                    }

                    // 3. 自动同步最新的封面图 (防止旧图挂掉)
                    if (info.images && info.images.common) {
                        anime.cover = info.images.common;
                    }

                    console.log(`✅ [${i+1}/${animeList.length}] ${anime.title} | 评分: ${anime.score} | 想看: ${anime.wish}`);
                }
            } catch (err) {
                console.error(`❌ ${anime.title} 更新失败:`, err.message);
            }

            // 频率控制：每秒请求 3 个左右，保护对方服务器
            await new Promise(r => setTimeout(r, 400));
        }

        // 获取北京时间
        const now = new Date();
        const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
        const lastUpdated = beijingTime.toLocaleString('zh-CN', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // 包装数据为对象
        const output = {
            lastUpdated: lastUpdated,
            items: animeList
        };

        // 写入更新后的数据
        // 保持原文件结构：
        // - anime_data.json：写 { lastUpdated, items }
        // - season 文件：保留 season 字段，并更新 lastUpdated/items
        if (!Array.isArray(json) && json && typeof json === 'object' && json.season) {
            json.lastUpdated = lastUpdated;
            json.items = animeList;
            fs.writeFileSync(targetFile, JSON.stringify(json, null, 2));
        } else {
            fs.writeFileSync(targetFile, JSON.stringify(output, null, 2));
        }

        console.log('\n✨ 全部数据同步完成！快去 Git Push 吧。\n' +
                    `最新更新时间：${lastUpdated}`);

    } catch (error) {
        console.error('💥 脚本运行出错:', error.message);
    }
}

updateAll();