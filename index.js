const axios = require("axios");
const fs = require("fs");
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
    metaTags: raw.tags ? raw.tags.map((t) => t.name) : [],
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

const TAG_QUERY = ["2026年1月", "日本"];
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

      const cleaned = transformToCardData(response.data);
      finalLibrary.push(cleaned);

      console.log(chalk.green(`  [OK] ${cleaned.title}`));
      // 延时 500ms 保护 API
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.log(chalk.red(`  [ERR] ID:${id} 抓取详情失败：${e.message}`));
    }
  }

  // 写入文件
  fs.writeFileSync("./anime_data.json", JSON.stringify(finalLibrary, null, 2));
  console.log(
    chalk.bgGreen.black(
      "\n 🎉 自动化采集任务全部完成！anime_data.json 已更新 \n",
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
