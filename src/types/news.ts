export type SourceType = "official" | "media" | "search" | "research";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceId: string;
  sourceType: SourceType;
  language: string;
  publishedAt: string;
  summary: string;
  topics: string[];
  heat: number;
  image?: string;
}

export interface TopicStat {
  name: string;
  count: number;
  heat: number;
}

export interface SourceHealth {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  language: string;
  originLanguage?: string;
  ok: boolean;
  itemCount: number;
}

export interface NewsPayload {
  generatedAt: string;
  cadenceMinutes: number;
  nextUpdateHint: string;
  stats: {
    total: number;
    sourceCount: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
    windowHours: number;
    latestPublishedAt: string;
  };
  topics: TopicStat[];
  sources: SourceHealth[];
  failures: string[];
  items: NewsItem[];
}
