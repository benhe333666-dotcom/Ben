const googleNews = (query, language = "zh-CN", region = "CN", ceid = "CN:zh-Hans") => {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=${language}&gl=${region}&ceid=${ceid}`;
};

export const SOURCE_DEFINITIONS = [
  {
    id: "openai-news",
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    type: "official",
    language: "en",
    aiFocused: true,
    weight: 1.18
  },
  {
    id: "anthropic-news",
    name: "Anthropic News",
    url: "https://www.anthropic.com/news",
    parser: "anthropic-html",
    type: "official",
    language: "en",
    aiFocused: true,
    weight: 1.14
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://research.google/blog/rss/",
    type: "official",
    language: "en",
    aiFocused: true,
    weight: 1.08
  },
  {
    id: "huggingface-blog",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    type: "official",
    language: "en",
    aiFocused: true,
    weight: 1.04
  },
  {
    id: "microsoft-ai-blog",
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    type: "official",
    language: "en",
    aiFocused: true,
    weight: 1.02
  },
  {
    id: "nvidia-ai-blog",
    name: "NVIDIA AI Blog",
    url: "https://feeds.feedburner.com/nvidiablog",
    type: "official",
    language: "en",
    aiFocused: false,
    weight: 1.08
  },
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    type: "media",
    language: "en",
    aiFocused: true,
    weight: 0.98
  },
  {
    id: "venturebeat-ai",
    name: "VentureBeat AI",
    url: "https://venturebeat.com/category/ai/feed/",
    type: "media",
    language: "en",
    aiFocused: true,
    weight: 0.96
  },
  {
    id: "mit-tr-ai",
    name: "MIT Technology Review AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    type: "media",
    language: "en",
    aiFocused: true,
    weight: 0.95
  },
  {
    id: "the-decoder",
    name: "The Decoder",
    url: "https://the-decoder.com/feed/",
    type: "media",
    language: "en",
    aiFocused: true,
    weight: 0.92
  },
  {
    id: "google-news-ai-zh",
    name: "Google News: AI 中文",
    url: googleNews("人工智能 OR 大模型 OR ChatGPT OR OpenAI OR Claude OR Gemini when:2d"),
    type: "search",
    language: "zh",
    aiFocused: false,
    weight: 0.9
  },
  {
    id: "google-news-ai-global",
    name: "Google News: Global AI",
    url: googleNews(
      "artificial intelligence OR OpenAI OR Anthropic OR DeepMind OR Nvidia AI when:2d",
      "en-US",
      "US",
      "US:en"
    ),
    type: "search",
    language: "en",
    aiFocused: false,
    weight: 0.9
  },
  {
    id: "google-news-ai-regulation",
    name: "Google News: AI Regulation",
    url: googleNews("AI regulation OR AI safety OR AI policy when:3d", "en-US", "US", "US:en"),
    type: "search",
    language: "en",
    aiFocused: false,
    weight: 0.88
  },
  {
    id: "google-news-ai-chips",
    name: "Google News: AI Chips",
    url: googleNews("AI chips OR Nvidia GPU OR AI accelerator when:3d", "en-US", "US", "US:en"),
    type: "search",
    language: "en",
    aiFocused: false,
    weight: 0.88
  },
  {
    id: "arxiv-ai",
    name: "arXiv cs.AI",
    url: "https://export.arxiv.org/rss/cs.AI",
    type: "research",
    language: "en",
    aiFocused: true,
    weight: 0.78
  }
];
