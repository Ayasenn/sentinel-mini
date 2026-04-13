const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(ROOT, "anime_data.json");
const OUT_DIR = path.join(ROOT, "data", "seasons");
const LIBRARY_OUT = path.join(ROOT, "data", "library.json");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function seasonStartMonth(month) {
  // Anime seasons are typically Jan/Apr/Jul/Oct
  const m = Number(month);
  if (!Number.isFinite(m) || m < 1 || m > 12) return null;
  const start = Math.floor((m - 1) / 3) * 3 + 1;
  return start; // 1,4,7,10
}

function seasonKeyFromYearMonth(year, month) {
  const start = seasonStartMonth(month);
  if (!start) return null;
  return `${year}-${pad2(start)}`;
}

function parseYearMonthFromAirDate(airDate) {
  if (!airDate || typeof airDate !== "string") return null;

  // 1) ISO: 2026-01-30
  const iso = airDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]) };

  // 2) JP/CN: 2026年1月10日 / 2026年1月
  const ym = airDate.match(/(\d{4})年\s*(\d{1,2})月/);
  if (ym) return { year: Number(ym[1]), month: Number(ym[2]) };

  return null;
}

function inferYearMonthFromTags(metaTags) {
  if (!Array.isArray(metaTags)) return null;
  for (const t of metaTags) {
    if (typeof t !== "string") continue;
    const m = t.match(/(\d{4})年\s*(\d{1,2})月/);
    if (m) return { year: Number(m[1]), month: Number(m[2]) };
  }
  return null;
}

function readInput() {
  const raw = fs.readFileSync(INPUT, "utf8");
  const json = JSON.parse(raw);
  const items = Array.isArray(json) ? json : json.items || [];
  const lastUpdated = Array.isArray(json) ? null : json.lastUpdated || null;
  if (!Array.isArray(items)) throw new Error("anime_data.json: items 不是数组");
  return { lastUpdated, items };
}

function main() {
  ensureDir(OUT_DIR);

  const { lastUpdated, items } = readInput();

  /** @type {Record<string, any[]>} */
  const buckets = {};
  /** @type {any[]} */
  const unknown = [];

  for (const item of items) {
    const fromAir = parseYearMonthFromAirDate(item.airDate);
    const fromTags = inferYearMonthFromTags(item.metaTags);
    const ym = fromAir || fromTags;
    const key = ym ? seasonKeyFromYearMonth(ym.year, ym.month) : null;

    if (!key) {
      unknown.push(item);
      continue;
    }
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(item);
  }

  const seasonKeys = Object.keys(buckets).sort();

  // Write season files
  for (const key of seasonKeys) {
    const outPath = path.join(OUT_DIR, `${key}.json`);
    const payload = {
      season: key,
      lastUpdated: lastUpdated,
      items: buckets[key],
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  }

  if (unknown.length) {
    const outPath = path.join(OUT_DIR, `_unknown.json`);
    const payload = {
      season: "_unknown",
      lastUpdated: lastUpdated,
      items: unknown,
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  }

  // Write library index
  const library = {
    lastBuiltFrom: "anime_data.json",
    builtAt: new Date().toISOString(),
    seasons: seasonKeys,
    counts: Object.fromEntries(seasonKeys.map((k) => [k, buckets[k].length])),
    unknownCount: unknown.length,
  };
  ensureDir(path.dirname(LIBRARY_OUT));
  fs.writeFileSync(LIBRARY_OUT, JSON.stringify(library, null, 2));

  console.log(
    `✅ 分片完成：${seasonKeys.length} 个 season，unknown=${unknown.length}`,
  );
  for (const key of seasonKeys) {
    console.log(` - ${key}: ${buckets[key].length}`);
  }
}

main();

