import { mkdir, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { SOURCE_DEFINITIONS } from "./sources.mjs";

const OUTPUT_PATH = new URL("../public/news.json", import.meta.url);
const SOURCES_PATH = new URL("../public/sources.json", import.meta.url);
const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS || "140", 10);
const WINDOW_HOURS = Number.parseInt(process.env.WINDOW_HOURS || "240", 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "12000", 10);

const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "openai",
  "chatgpt",
  "gpt",
  "anthropic",
  "claude",
  "gemini",
  "deepmind",
  "llm",
  "large language model",
  "generative",
  "sora",
  "copilot",
  "mistral",
  "llama",
  "xai",
  "grok",
  "agent",
  "machine learning",
  "neural",
  "nvidia",
  "gpu",
  "人工智能",
  "大模型",
  "模型",
  "生成式",
  "智能体",
  "算力",
  "英伟达",
  "多模态",
  "芯片",
  "机器人",
  "自动驾驶",
  "监管"
];

const TOPIC_RULES = [
  { name: "模型发布", keys: ["gpt", "claude", "gemini", "llama", "mistral", "model", "大模型", "模型发布"] },
  { name: "产品应用", keys: ["app", "product", "copilot", "chatgpt", "assistant", "agent", "应用", "智能体"] },
  { name: "算力芯片", keys: ["nvidia", "gpu", "chip", "semiconductor", "cuda", "算力", "芯片", "英伟达"] },
  { name: "监管安全", keys: ["regulation", "policy", "safety", "copyright", "law", "监管", "安全", "版权"] },
  { name: "研究论文", keys: ["research", "paper", "benchmark", "arxiv", "研究", "论文", "基准"] },
  { name: "投融资", keys: ["funding", "startup", "valuation", "invest", "ipo", "融资", "估值", "投资"] },
  { name: "多模态", keys: ["video", "image", "audio", "multimodal", "sora", "vision", "多模态", "视频", "图像", "语音"] },
  { name: "端侧AI", keys: ["device", "edge", "phone", "pc", "laptop", "端侧", "手机", "本地"] },
  { name: "开源生态", keys: ["open source", "hugging face", "github", "apache", "开源"] },
  { name: "机器人", keys: ["robot", "robotics", "humanoid", "机器人", "具身"] }
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  trimValues: true
});

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return value.__cdata || value["#text"] || value["@_href"] || "";
  return "";
};

const decodeEntities = (value) =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value) =>
  decodeEntities(getText(value))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTitle = (title) =>
  title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\p{L}\p{N}\u4e00-\u9fa5]+/gu, " ")
    .replace(/\b(the|a|an|to|of|for|and|in|on|with|from|by|is|are)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const canonicalUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) =>
      url.searchParams.delete(key)
    );
    return url.toString();
  } catch {
    return rawUrl;
  }
};

const pickLink = (item) => {
  if (typeof item.link === "string") return item.link;
  if (Array.isArray(item.link)) {
    const alternate = item.link.find((link) => link["@_rel"] === "alternate") || item.link[0];
    return alternate?.["@_href"] || getText(alternate);
  }
  return item.link?.["@_href"] || item.guid?.["#text"] || getText(item.guid) || "";
};

const pickImage = (item) => {
  const mediaContent = asArray(item["media:content"]).find((entry) => entry?.["@_url"]);
  const mediaThumbnail = asArray(item["media:thumbnail"]).find((entry) => entry?.["@_url"]);
  const enclosure = asArray(item.enclosure).find((entry) => entry?.["@_type"]?.startsWith?.("image/"));
  return mediaContent?.["@_url"] || mediaThumbnail?.["@_url"] || enclosure?.["@_url"] || item.image?.url || "";
};

const extractItems = (xml) => {
  const parsed = parser.parse(xml);
  if (parsed.rss?.channel?.item) return asArray(parsed.rss.channel.item);
  if (parsed.feed?.entry) return asArray(parsed.feed.entry);
  if (parsed.RDF?.item) return asArray(parsed.RDF.item);
  return [];
};

const extractAnthropicItems = (html) => {
  const items = [];
  const blockPattern = /<a href="(\/news\/[^"]+)"[\s\S]*?<\/a>/g;
  const seen = new Set();
  let match;

  while ((match = blockPattern.exec(html)) && items.length < 28) {
    const block = match[0];
    const path = match[1];
    if (seen.has(path)) continue;

    const title = stripHtml(block.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/)?.[1]);
    const description = stripHtml(block.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1]);
    const pubDate = stripHtml(block.match(/<time[^>]*>([\s\S]*?)<\/time>/)?.[1]);

    if (!title) continue;
    seen.add(path);
    items.push({
      title,
      description,
      pubDate,
      link: `https://www.anthropic.com${path}`
    });
  }

  return items;
};

const extractSourceItems = (body, source) => {
  if (source.parser === "anthropic-html") return extractAnthropicItems(body);
  return extractItems(body);
};

const hasAiSignal = (text, aiFocused) => {
  if (aiFocused) return true;
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
};

const inferTopics = (text) => {
  const lower = text.toLowerCase();
  const topics = TOPIC_RULES.filter((rule) => rule.keys.some((key) => lower.includes(key.toLowerCase()))).map(
    (rule) => rule.name
  );
  return topics.length ? topics.slice(0, 3) : ["AI动态"];
};

const heatScore = ({ publishedAt, source, topics, text }) => {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 36e5);
  const recency = Math.max(0, 48 - ageHours) * 0.85;
  const sourceBoost = source.weight * 18;
  const topicBoost = Math.min(18, topics.length * 5);
  const titleBoost = /openai|anthropic|google|deepmind|nvidia|claude|gemini|gpt|监管|大模型|英伟达/i.test(text)
    ? 8
    : 0;
  return Math.max(28, Math.min(99, Math.round(24 + recency + sourceBoost + topicBoost + titleBoost)));
};

const summarize = (raw, title) => {
  const cleaned = stripHtml(raw);
  if (!cleaned || cleaned === title) return "来自公开新闻源的 AI 相关动态，点击原文查看完整报道。";
  return cleaned.length > 190 ? `${cleaned.slice(0, 186)}...` : cleaned;
};

const fetchWithTimeout = async (source) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "AI-News-Timeline/0.1 (+https://github.com)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeItem = (item, source) => {
  const title = stripHtml(item.title);
  const link = canonicalUrl(pickLink(item));
  const rawPublished = item.pubDate || item.published || item.updated || item["dc:date"] || item.created;
  const publishedAt = new Date(getText(rawPublished) || Date.now()).toISOString();
  const summary = summarize(item.description || item.summary || item.content || item["content:encoded"], title);
  const text = `${title} ${summary}`;

  if (!title || !link || !hasAiSignal(text, source.aiFocused)) return null;

  const topics = inferTopics(text);
  return {
    id: `${source.id}-${normalizeTitle(title).slice(0, 64).replace(/\s/g, "-")}`,
    title,
    url: link,
    source: source.name,
    sourceId: source.id,
    sourceType: source.type,
    language: source.language,
    publishedAt,
    summary,
    topics,
    heat: heatScore({ publishedAt, source, topics, text }),
    image: pickImage(item)
  };
};

const dedupeItems = (items) => {
  const seen = new Map();
  for (const item of items) {
    const titleKey = normalizeTitle(item.title);
    const key = item.url.includes("news.google.com") ? titleKey.slice(0, 96) : item.url;
    const previous = seen.get(key);
    if (!previous || item.heat > previous.heat) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
};

const buildTopicStats = (items) => {
  const topicMap = new Map();
  for (const item of items) {
    for (const topic of item.topics) {
      const current = topicMap.get(topic) || { name: topic, count: 0, heat: 0 };
      current.count += 1;
      current.heat += item.heat;
      topicMap.set(topic, current);
    }
  }
  return [...topicMap.values()]
    .map((topic) => ({ ...topic, heat: Math.round(topic.heat / topic.count) }))
    .sort((a, b) => b.count * b.heat - a.count * a.heat)
    .slice(0, 12);
};

const main = async () => {
  await mkdir(new URL("../public", import.meta.url), { recursive: true });

  const settled = await Promise.allSettled(
    SOURCE_DEFINITIONS.map(async (source) => {
      try {
        const xml = await fetchWithTimeout(source);
        const normalized = extractSourceItems(xml, source)
          .map((item) => normalizeItem(item, source))
          .filter(Boolean);
        return { source, items: normalized };
      } catch (error) {
        throw new Error(`${source.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    })
  );

  const successes = [];
  const failures = [];
  for (const result of settled) {
    if (result.status === "fulfilled") successes.push(result.value);
    else failures.push(result.reason?.message || String(result.reason));
  }

  const cutoff = Date.now() - WINDOW_HOURS * 36e5;
  const items = dedupeItems(successes.flatMap((entry) => entry.items))
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ITEMS);

  const generatedAt = new Date().toISOString();
  const sourceHealth = SOURCE_DEFINITIONS.map((source) => {
    const success = successes.find((entry) => entry.source.id === source.id);
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      type: source.type,
      language: source.language,
      ok: Boolean(success),
      itemCount: success?.items.length || 0
    };
  });

  const payload = {
    generatedAt,
    cadenceMinutes: 60,
    nextUpdateHint: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    stats: {
      total: items.length,
      sourceCount: SOURCE_DEFINITIONS.length,
      sourcesSucceeded: successes.length,
      sourcesFailed: SOURCE_DEFINITIONS.length - successes.length,
      windowHours: WINDOW_HOURS,
      latestPublishedAt: items[0]?.publishedAt || generatedAt
    },
    topics: buildTopicStats(items),
    sources: sourceHealth,
    failures,
    items
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(
    SOURCES_PATH,
    `${JSON.stringify(
      SOURCE_DEFINITIONS.map(({ id, name, url, type, language }) => ({ id, name, url, type, language })),
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log(`Generated ${items.length} AI news items from ${successes.length}/${SOURCE_DEFINITIONS.length} sources.`);
  if (failures.length) console.log(`Failures: ${failures.join(" | ")}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
