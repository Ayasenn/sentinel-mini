/*
 * 更新脚本：同步指定季度番剧的评分、想看数、封面
 *
 * 用法：
 *   node update.js              # 更新 library.json 中最新一季
 *   node update.js 2026-07      # 更新指定季节
 *   node update.js 26-7         # 简写，同上
 *
 * 也可在下方 SEASON_KEY 写死季节（命令行参数优先）
 */
const fs = require('fs');
const path = require('path');

// ====== 可选手动指定季节 ======
const SEASON_KEY = null; // 例如 "2026-07"，null 表示更新最新一季
// ============================

// const LEGACY_FILE = './anime_data.json';
const UA = 'Ayasen-Anime-Sentinel/1.0';

function getLatestSeasonKeyFromLibrary() {
    const libraryPath = path.join(__dirname, 'data', 'library.json');
    if (!fs.existsSync(libraryPath)) return null;

    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
    const seasons = Array.isArray(library.seasons) ? library.seasons.slice() : [];
    if (!seasons.length) return null;

    seasons.sort().reverse();
    return seasons[0];
}

function parseSeasonArg(arg) {
    if (!arg) return null;

    if (/^\d{4}-\d{2}$/.test(arg)) return arg;

    const shorthand = String(arg).match(/^(\d{2})-(\d{1,2})$/);
    if (shorthand) {
        return `20${shorthand[1]}-${String(shorthand[2]).padStart(2, '0')}`;
    }

    return null;
}

function resolveSeasonKey() {
    const fromCli = parseSeasonArg(process.argv[2]);
    if (fromCli) return fromCli;
    if (SEASON_KEY) return SEASON_KEY;
    return getLatestSeasonKeyFromLibrary();
}

function resolveTargetFile(seasonKey) {
  // 旧版兼容：优先更新 anime_data.json
  // const legacyPath = path.join(__dirname, 'anime_data.json');
  // if (fs.existsSync(legacyPath)) return legacyPath;

    if (!seasonKey) {
        console.error('❌ 未指定季节，且 library.json 中无可用 seasons');
        return null;
    }

    const seasonFile = path.join(__dirname, 'data', 'seasons', `${seasonKey}.json`);
    if (!fs.existsSync(seasonFile)) {
        console.error(`❌ 未找到季节文件: data/seasons/${seasonKey}.json`);
        return null;
    }

    return seasonFile;
}

async function updateAll() {
    try {
        const seasonKey = resolveSeasonKey();
        const targetFile = resolveTargetFile(seasonKey);
        if (!targetFile) return;

        const rawData = fs.readFileSync(targetFile, 'utf8');
        const json = JSON.parse(rawData);
        const animeList = json.items;

        if (!Array.isArray(animeList)) {
            console.error('❌ 数据格式错误：season 文件缺少 items 数组');
            return;
        }

        console.log(`📡 [${seasonKey}] 正在为 ${animeList.length} 部番剧同步最新情报...`);

        for (let i = 0; i < animeList.length; i++) {
            const anime = animeList[i];
            if (!anime.id) continue;

            try {
                const res = await fetch(`https://api.bgm.tv/v0/subjects/${anime.id}`, {
                    headers: { 'User-Agent': UA }
                });

                const info = await res.json();

                if (info.rating) {
                    anime.score = info.rating.score || 0;

                    if (info.collection) {
                        anime.wish = info.collection.wish || 0;
                    }

                    if (info.images && info.images.common) {
                        anime.cover = info.images.common;
                    }

                    console.log(`✅ [${i + 1}/${animeList.length}] ${anime.title || anime.originTitle} | 评分: ${anime.score} | 想看: ${anime.wish}`);
                }
            } catch (err) {
                console.error(`❌ ${anime.title || anime.originTitle} 更新失败:`, err.message);
            }

            await new Promise(r => setTimeout(r, 400));
        }

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

        json.lastUpdated = lastUpdated;
        json.items = animeList;
        fs.writeFileSync(targetFile, JSON.stringify(json, null, 2));

        console.log(`\n✨ [${seasonKey}] 全部数据同步完成！快去 Git Push 吧。`);
        console.log(`最新更新时间：${lastUpdated}`);

    } catch (error) {
        console.error('💥 脚本运行出错:', error.message);
    }
}

updateAll();
