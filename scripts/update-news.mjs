import { mkdir, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { SOURCE_DEFINITIONS } from "./sources.mjs";

const OUTPUT_PATH = new URL("../public/news.json", import.meta.url);
const SOURCES_PATH = new URL("../public/sources.json", import.meta.url);
const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS || "140", 10);
const WINDOW_HOURS = Number.parseInt(process.env.WINDOW_HOURS || "240", 10);
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "12000", 10);

const CHINA_REACHABLE_HOSTS = [
  "36kr.com",
  "cnblogs.com",
  "ithome.com",
  "leiphone.com",
  "my.oschina.net",
  "oschina.net",
  "qbitai.com"
];

const AI_KEYWORDS = [
  "ai",
  "aigc",
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
  "agents",
  "machine learning",
  "neural",
  "nvidia",
  "gpu",
  "deepseek",
  "qwen",
  "kimi",
  "doubao",
  "ernie",
  "人工智能",
  "智能",
  "大模型",
  "模型",
  "生成式",
  "生成式人工智能",
  "智能体",
  "智能助手",
  "通义",
  "千问",
  "文心",
  "豆包",
  "月之暗面",
  "深度求索",
  "算力",
  "英伟达",
  "多模态",
  "芯片",
  "机器人",
  "自动驾驶",
  "监管",
  "具身",
  "李飞飞"
];

const TOPIC_RULES = [
  { name: "模型发布", keys: ["gpt", "claude", "gemini", "llama", "mistral", "model", "大模型", "模型发布"] },
  { name: "产品应用", keys: ["app", "product", "copilot", "chatgpt", "assistant", "agent", "应用", "智能体"] },
  { name: "算力芯片", keys: ["nvidia", "gpu", "chip", "semiconductor", "cuda", "算力", "芯片", "英伟达"] },
  { name: "监管安全", keys: ["regulation", "policy", "safety", "copyright", "law", "监管", "安全", "版权"] },
  { name: "研究论文", keys: ["research", "paper", "benchmark", "arxiv", "研究", "论文", "基准"] },
  { name: "投融资", keys: ["funding", "startup", "valuation", "invest", "ipo", "融资", "估值", "投资"] },
  { name: "多模态", keys: ["video", "image", "audio", "multimodal", "sora", "vision", "多模态", "视频", "图像", "语音"] },
  { name: "端侧智能", keys: ["device", "edge", "phone", "pc", "laptop", "端侧", "手机", "本地"] },
  { name: "开源生态", keys: ["open source", "hugging face", "github", "apache", "开源"] },
  { name: "机器人", keys: ["robot", "robotics", "humanoid", "机器人", "具身"] }
];

const ROUND_LABELS = {
  A: "第一轮",
  B: "第二轮",
  C: "第三轮",
  D: "第四轮",
  E: "第五轮",
  F: "第六轮",
  G: "第七轮",
  H: "第八轮"
};

const DISPLAY_REPLACEMENTS = [
  [/\b2D\b/gi, "二维"],
  [/\b3D\b/gi, "三维"],
  [/\b88\s*VIP\b/gi, "会员"],
  [/\bVIP\b/gi, "会员"],
  [/\b3C\b/gi, "消费电子"],
  [/\bUSB\s*Type\s*-?\s*C\b/gi, "通用串行总线丙型接口"],
  [/\bType\s*-?\s*C\b/gi, "丙型接口"],
  [/\bUSB\b/gi, "通用串行总线"],
  [/\bWi\s*-?\s*Fi\b/gi, "无线网络"],
  [/\bArtificial Intelligence\b/gi, "人工智能"],
  [/\bGenerative AI\b/gi, "生成式人工智能"],
  [/\bOpen Source\b/gi, "开源"],
  [/\bMachine Learning\b/gi, "机器学习"],
  [/\bDeep Learning\b/gi, "深度学习"],
  [/\bLarge Language Model(s)?\b/gi, "大语言模型"],
  [/\bDeepSeek\b/gi, "深度求索"],
  [/\bWindows\b/gi, "视窗系统"],
  [/\bStellantis\b/gi, "斯特兰蒂斯"],
  [/\bQualcomm\b/gi, "高通"],
  [/\bSnapdragon\b/gi, "骁龙"],
  [/\bOPPO\b/gi, "欧珀"],
  [/\bEnco\b/gi, "声学耳机"],
  [/\bAirPods\b/gi, "苹果耳机"],
  [/\biPhone\b/gi, "苹果手机"],
  [/\biPad\b/gi, "苹果平板"],
  [/\bMac\b/gi, "苹果电脑"],
  [/\bHarmonyOS\b/gi, "鸿蒙系统"],
  [/\bAndroid\b/gi, "安卓"],
  [/\biOS\b/gi, "苹果移动系统"],
  [/\bSoC\b/gi, "系统级芯片"],
  [/\bPro\b/gi, "专业版"],
  [/\bMax\b/gi, "旗舰版"],
  [/\bMini\b/gi, "小型版"],
  [/\bOpenAI\b/gi, "开放人工智能公司"],
  [/\bAnthropic\b/gi, "人工智能安全公司"],
  [/\bChatGPT\b/gi, "智能聊天助手"],
  [/\bClaude\b/gi, "克劳德模型"],
  [/\bGemini\b/gi, "双子座模型"],
  [/\bDeepMind\b/gi, "深度思维"],
  [/\bGoogle\b/gi, "谷歌"],
  [/\bMicrosoft\b/gi, "微软"],
  [/\bNVIDIA\b/gi, "英伟达"],
  [/\bApple\b/gi, "苹果"],
  [/\bMeta\b/gi, "元宇宙平台公司"],
  [/\bTesla\b/gi, "特斯拉"],
  [/\bByteDance\b/gi, "字节跳动"],
  [/\bAlibaba\b/gi, "阿里巴巴"],
  [/\bBaidu\b/gi, "百度"],
  [/\bTencent\b/gi, "腾讯"],
  [/\bQwen\b/gi, "通义千问"],
  [/\bKimi\b/gi, "月之暗面"],
  [/\bDoubao\b/gi, "豆包"],
  [/\bErnie\b/gi, "文心"],
  [/\bLlama\b/gi, "开源大语言模型"],
  [/\bMistral\b/gi, "欧洲大模型"],
  [/\bCopilot\b/gi, "智能副驾"],
  [/\bImageNet\b/gi, "图像网络数据集"],
  [/\bSora\b/gi, "视频生成模型"],
  [/\bAIGC\b/gi, "生成式人工智能"],
  [/\bAI\b/gi, "人工智能"],
  [/\bAGI\b/gi, "通用人工智能"],
  [/\bLLM(s)?\b/gi, "大语言模型"],
  [/\bGPU(s)?\b/gi, "图形处理器"],
  [/\bCPU(s)?\b/gi, "中央处理器"],
  [/\bTPU(s)?\b/gi, "张量处理器"],
  [/\bAPI(s)?\b/gi, "接口"],
  [/\bSDK(s)?\b/gi, "开发工具包"],
  [/\bIT\b/gi, "信息技术"],
  [/\bPC(s)?\b/gi, "电脑"],
  [/\bApp(s)?\b/gi, "应用"],
  [/\bAgent(s)?\b/gi, "智能体"],
  [/\bToken(s)?\b/gi, "词元"],
  [/\bCode\b/gi, "代码"],
  [/\bCoding\b/gi, "编程"],
  [/\bModel(s)?\b/gi, "模型"],
  [/\bBenchmark(s)?\b/gi, "基准测试"],
  [/\bRobot(s|ics)?\b/gi, "机器人"],
  [/\bHumanoid\b/gi, "人形机器人"],
  [/\bVision\b/gi, "视觉"],
  [/\bCloud\b/gi, "云服务"],
  [/\bChip(s)?\b/gi, "芯片"],
  [/\bFunding\b/gi, "融资"],
  [/\bStartup(s)?\b/gi, "创业公司"],
  [/\bIPO\b/gi, "首次公开募股"],
  [/\bCEO\b/gi, "首席执行官"],
  [/\bACM\b/gi, "国际计算机学会"],
  [/\bGitHub\b/gi, "代码托管平台"],
  [/\bApache\b/gi, "阿帕奇"],
  [/\bComing\b/gi, "即将推出"],
  [/\bReportedly\b/gi, "据报道"],
  [/\bResearch\b/gi, "研究"],
  [/\bSafety\b/gi, "安全"],
  [/\bPolicy\b/gi, "政策"],
  [/\bRegulation\b/gi, "监管"],
  [/\bWorkflow\b/gi, "工作流"],
  [/\bData\b/gi, "数据"],
  [/\bSecurity\b/gi, "安全"],
  [/\bNews\b/gi, "新闻"],
  [/\bReview\b/gi, "评测"],
  [/\bLive\b/gi, "实时"]
];

const localizeDisplayText = (value) => {
  let text = stripHtml(value);
  text = text.replace(/IT之家/g, "科技之家");
  text = text.replace(/\b([A-H])轮/g, (_, round) => `${ROUND_LABELS[round] || round}融资`);
  text = text.replace(/\bV(\d+)\b/gi, (_, version) => `第${version}代`);
  text = text.replace(/(\d+(?:\.\d+)?)\s*mAh\b/gi, "$1 毫安时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*Wh\b/gi, "$1 瓦时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*kWh\b/gi, "$1 千瓦时");
  text = text.replace(/(\d+(?:\.\d+)?)\s*GHz\b/gi, "$1 吉赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MHz\b/gi, "$1 兆赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*Hz\b/gi, "$1 赫兹");
  text = text.replace(/(\d+(?:\.\d+)?)\s*W\b/g, "$1 瓦");
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm\b/gi, "$1 厘米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 毫米");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MP\b/gi, "$1 百万像素");
  text = text.replace(/(\d+(?:\.\d+)?)\s*g\b/gi, "$1 克");
  text = text.replace(/(\d+(?:\.\d+)?)\s*MB\b/gi, "$1 兆字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*GB\b/gi, "$1 吉字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*TB\b/gi, "$1 太字节");
  text = text.replace(/(\d+(?:\.\d+)?)\s*TOPS\b/gi, "$1 万亿次运算");
  for (const [pattern, replacement] of DISPLAY_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/\b[A-Za-z][A-Za-z0-9+._-]*\b/g, "相关名称")
    .replace(/\s+-\s+/g, "，来源：")
    .replace(/\s+\|\s+/g, "，")
    .replace(/相关名称(\s*相关名称)+/g, "相关名称")
    .replace(/\s+/g, " ")
    .replace(/([，。！？；：])\s+/g, "$1")
    .trim();
};

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

const isChinaReachableUrl = (rawUrl) => {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    return CHINA_REACHABLE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
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

const extractSourceItems = (body, source) => {
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
  return topics.length ? topics.slice(0, 3) : ["人工智能动态"];
};

const heatScore = ({ publishedAt, source, topics, text }) => {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 36e5);
  const recency = Math.max(0, 48 - ageHours) * 0.85;
  const sourceBoost = source.weight * 18;
  const topicBoost = Math.min(18, topics.length * 5);
  const titleBoost = /openai|anthropic|google|deepmind|nvidia|claude|gemini|gpt|deepseek|qwen|kimi|监管|大模型|英伟达|深度求索|通义|千问|月之暗面/i.test(text)
    ? 8
    : 0;
  return Math.max(28, Math.min(99, Math.round(24 + recency + sourceBoost + topicBoost + titleBoost)));
};

const summarize = (raw, title) => {
  const cleaned = stripHtml(raw);
  if (!cleaned || cleaned === title) return "来自公开中文新闻源的人工智能相关动态，点击原文查看完整报道。";
  return cleaned.length > 190 ? `${cleaned.slice(0, 186)}...` : cleaned;
};

const fetchWithTimeout = async (source) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Chinese-AI-News-Timeline/0.2)",
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
  const rawTitle = stripHtml(item.title);
  const link = canonicalUrl(pickLink(item));
  const rawPublished = item.pubDate || item.published || item.updated || item["dc:date"] || item.created;
  const publishedAt = new Date(getText(rawPublished) || Date.now()).toISOString();
  const title = localizeDisplayText(rawTitle);
  const rawSummary = summarize(item.description || item.summary || item.content || item["content:encoded"], rawTitle);
  const summary = localizeDisplayText(rawSummary);
  const text = `${rawTitle} ${rawSummary} ${title} ${summary}`;

  if (!title || !link || !isChinaReachableUrl(link) || !hasAiSignal(text, source.aiFocused)) return null;

  const topics = inferTopics(text);
  return {
    id: `${source.id}-${normalizeTitle(title).slice(0, 64).replace(/\s/g, "-")}`,
    title,
    url: link,
    source: source.name,
    sourceId: source.id,
    sourceType: source.type,
    language: "zh",
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
    const key = item.url || titleKey.slice(0, 96);
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
