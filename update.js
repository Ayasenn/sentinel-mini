const fs = require('fs');

const FILE_NAME = './anime_data.json';
const UA = 'Ayasen-Anime-Sentinel/1.0'; // 规范的 User-Agent 避免被封

async function updateAll() {
    try {
        const rawData = fs.readFileSync(FILE_NAME, 'utf8');
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
        fs.writeFileSync(FILE_NAME, JSON.stringify(output, null, 2));
        console.log('\n✨ 全部数据同步完成！快去 Git Push 吧。\n' +
                    `最新更新时间：${lastUpdated}`);

    } catch (error) {
        console.error('💥 脚本运行出错:', error.message);
    }
}

updateAll();