const axios = require("axios");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

/**
 * 核心逻辑 1：清洗数据格式 (保持你的原始定义)
 */
function transformToCardData(raw) {
  const findInfo = (targetKeys) => {
    if (!raw.infobox) return;
    const item = raw.infobox.find((i) => targetKeys.includes(i.key));
    if (!item) return;
    if (Array.isArray(item.value))
      return item.value.map((v) => v.v || v).join(" / ");
    return item.value;
  };

  // console.log(raw);

  const getOriginType = (tags) => {
    if (!tags) return "动画";
    const types = ["漫画改", "轻小说改", "游戏改", "原创"];
    const found = tags.find((t) => types.includes(t.name));
    return found ? found.name : "动画";
  };

  return {
    id: raw.id,
    title: raw.name_cn,
    originTitle: raw.name,
    cover: raw.images?.common || "",
    airDate: findInfo(["放送开始", "发售日"]) || raw.date,
    broadcast: findInfo(["放送星期"]),
    episodes: raw.total_episodes || findInfo(["话数"]),
    officialSite: findInfo(["官方网站"]),
    director: findInfo(["导演", "监督"]),
    studio: findInfo(["动画制作", "制作"]),
    script: findInfo(["系列构成", "脚本", "编剧"]),
    charDesign: findInfo(["人物设定", "角色设计"]),
    music: findInfo(["音乐"]),
    aniSongPerformers: findInfo(["主题歌演出"]),
    metaTags: raw.meta_tags  || [],
    origin: getOriginType(raw.tags),
    originInfo: findInfo(["原作"]),
    summary: raw.summary ? raw.summary.replace(/\r\n/g, " ") : "暂无简介",
    score: raw.rating?.score || 0,
    rank: raw.rating?.rank || 999,
    wish: raw.collection?.wish || 0,
    pvSearchKeywords: `${raw.name} PV Official Trailer`,
  };
}

/**
 * [逻辑层] 步骤 A：全量抓取 2026年1月 & 日本 标签下的所有 ID
 */

// ====== 只需要改这个 ======
const SEASON_KEY = "2026-04"; // 例如：2026-01 / 2026-04 / 2026-07 / 2026-10
// =========================

function seasonKeyToMonthTag(seasonKey) {
  // "2026-04" -> "2026年4月"
  const m = String(seasonKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = m[1];
  const month = String(Number(m[2])); // 去前导 0
  return `${year}年${month}月`;
}

const TAG_QUERY = [seasonKeyToMonthTag(SEASON_KEY), "日本"];

function getBeijingLastUpdated() {
  const now = new Date();
  const beijingTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }),
  );
  return beijingTime.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function updateLibraryIndex(seasonKey, count) {
  const libraryPath = path.join(__dirname, "data", "library.json");
  fs.mkdirSync(path.dirname(libraryPath), { recursive: true });

  let lib;
  if (fs.existsSync(libraryPath)) {
    lib = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
  } else {
    lib = { seasons: [], counts: {}, unknownCount: 0 };
  }

  lib.seasons = Array.isArray(lib.seasons) ? lib.seasons : [];
  lib.counts = lib.counts && typeof lib.counts === "object" ? lib.counts : {};

  if (!lib.seasons.includes(seasonKey)) lib.seasons.push(seasonKey);
  lib.seasons.sort(); // 小到大
  lib.counts[seasonKey] = count;
  lib.lastBuiltFrom = "data/seasons/*.json";
  lib.builtAt = new Date().toISOString();

  fs.writeFileSync(libraryPath, JSON.stringify(lib, null, 2));
}
async function getNewAnimeIds() {
  let offset = 0;
  let allIds = [];
  let total = 0;

  console.log(chalk.blue.bold(`\n🔍 开始全量检索标签: [${TAG_QUERY}] ...`));

  do {
    try {
      const { data } = await axios({
        method: "post",
        url: "https://api.bgm.tv/v0/search/subjects",
        // 对应文档里的 Parameters (query)
        params: {
          limit: 20, // maxLimit 即 20
          offset,
        },
        // 对应文档里的 Request body
        data: {
          filter: { type: [2], tag: TAG_QUERY },
        },
        headers: { "User-Agent": "Ayasen/SentinelProject/1.0" },
      });
      const items = data.data || [];
      total = data.total || 0;

      if (items.length > 0) {
        allIds = allIds.concat(items.map((item) => item.id));
        console.log(chalk.gray(`  [进度] 已捕获 ${allIds.length} / ${total}`));
        offset += data.limit;
      } else {
        break;
      }

      // 避免请求过快导致 429
      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      console.error(
        chalk.red("分页检索失败："),
        error.response?.data || error.message,
      );
      break;
    }
  } while (allIds.length < total);

  const uniqueIds = [...new Set(allIds)];
  console.log(
    chalk.green(`✨ 检索完成，共锁定 ${uniqueIds.length} 部新番 ID\n`),
  );
  return uniqueIds;
}

/**
 * 步骤 B：深度抓取并清洗数据
 */
async function startSentinePipeline(idList) {
  const finalLibrary = [];
  console.log(chalk.cyan.bold(`🛰️  情报站启动：准备处理数据...`));
  for (const id of idList) {
    try {
      const response = await axios.get(`https://api.bgm.tv/v0/subjects/${id}`, {
        headers: { "User-Agent": "Ayasen/SentinelProject/1.0" },
      });
      console.log(response.data);

      const cleaned = transformToCardData(response.data);
      console.log(cleaned);
      finalLibrary.push(cleaned);

      console.log(chalk.green(`  [OK] ${cleaned.title}`));
      // 延时 500ms 保护 API
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.log(chalk.red(`  [ERR] ID:${id} 抓取详情失败：${e.message}`));
    }
  }

  // 写入分片文件（与 data/seasons/2026-01.json 格式一致）
  const outDir = path.join(__dirname, "data", "seasons");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${SEASON_KEY}.json`);
  const output = {
    season: SEASON_KEY,
    lastUpdated: getBeijingLastUpdated(),
    items: finalLibrary,
  };
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
  updateLibraryIndex(SEASON_KEY, finalLibrary.length);
  console.log(
    chalk.bgGreen.black(
      `\n 🎉 自动化采集任务全部完成！data/seasons/${SEASON_KEY}.json 已更新 \n`,
    ),
  );
}

/**
 * 最终执行入口
 */
async function main() {
  // 1. 先拿 ID
  const ids = await getNewAnimeIds();

  // 2. 拿详情并存文件
  if (ids.length > 0) {
    await startSentinePipeline(ids);
  } else {
    console.log(chalk.yellow("未发现新番 ID，任务终止。"));
  }
}

main();
