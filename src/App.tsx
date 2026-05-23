import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Flame,
  Globe2,
  Radio,
  RefreshCcw,
  Search,
  Sparkles,
  Zap
} from "lucide-react";
import { formatClock, formatDateTime, formatGroupDate, formatRelative, sourceTypeLabel } from "./lib/format";
import { filterItems, groupByDate, sourceDistribution } from "./lib/news";
import { mountTimelineMotion } from "./lib/hyperframesMotion";
import { useNewsFeed } from "./hooks/useNewsFeed";
import type { NewsItem, TopicStat } from "./types/news";

type SortMode = "latest" | "hot";

const sourceTypeOptions = [
  { label: "全部来源", value: "全部" },
  { label: "中文媒体", value: "media" }
];

const topicTone: Record<string, string> = {
  模型发布: "tone-green",
  产品应用: "tone-cyan",
  算力芯片: "tone-amber",
  监管安全: "tone-coral",
  研究论文: "tone-ink",
  投融资: "tone-lime",
  多模态: "tone-mint",
  端侧智能: "tone-gold",
  开源生态: "tone-sage",
  机器人: "tone-rust",
  人工智能动态: "tone-mint"
};

const heatLabel = (heat: number) => {
  if (heat >= 90) return "爆热";
  if (heat >= 78) return "高热";
  if (heat >= 62) return "升温";
  return "观察";
};

const HeatMeter = ({ value }: { value: number }) => (
  <div className="heat-meter" aria-label={`热度 ${value}`}>
    <span style={{ width: `${value}%` }} />
  </div>
);

const TopicPill = ({ topic }: { topic: string }) => <span className={`topic-pill ${topicTone[topic] || ""}`}>{topic}</span>;

const NewsCard = ({ item, fresh }: { item: NewsItem; fresh: boolean }) => (
  <article className={`news-card ${fresh ? "is-fresh" : ""}`}>
    <div className="card-time">
      <span className={`timeline-dot ${fresh ? "fresh-dot" : ""}`} />
      <time dateTime={item.publishedAt}>{formatClock(item.publishedAt)}</time>
      <span>{formatRelative(item.publishedAt)}</span>
    </div>

    <div className="card-body">
      <div className="card-meta">
        <span className="source-label">{sourceTypeLabel(item.sourceType)}</span>
        <span>{item.source}</span>
        <span>{heatLabel(item.heat)}</span>
      </div>

      <div className="card-title-row">
        <h3>{item.title}</h3>
        <a className="icon-link" href={item.url} target="_blank" rel="noreferrer" aria-label="打开原文">
          <ArrowUpRight size={18} />
        </a>
      </div>

      <p>{item.summary}</p>

      <div className="card-footer">
        <div className="topic-list">
          {item.topics.map((topic) => (
            <TopicPill key={topic} topic={topic} />
          ))}
        </div>
        <div className="heat-score">
          <Flame size={15} />
          <strong>{item.heat}</strong>
        </div>
      </div>
    </div>
  </article>
);

const StatCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) => (
  <div className="stat-card">
    <span>{icon}</span>
    <div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  </div>
);

const TopicRank = ({ topics }: { topics: TopicStat[] }) => (
  <div className="topic-rank">
    {topics.slice(0, 8).map((topic, index) => (
      <div className="rank-row" key={topic.name}>
        <span className="rank-index">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>{topic.name}</strong>
          <small>{topic.count} 条动态</small>
        </div>
        <HeatMeter value={topic.heat} />
      </div>
    ))}
  </div>
);

const DistributionBars = ({ items }: { items: NewsItem[] }) => {
  const distribution = sourceDistribution(items);
  const total = Math.max(1, items.length);
  const rows = sourceTypeOptions
    .filter((option) => option.value !== "全部")
    .map((option) => ({
      ...option,
      count: distribution[option.value] || 0,
      ratio: Math.round(((distribution[option.value] || 0) / total) * 100)
    }));

  return (
    <div className="distribution">
      {rows.map((row) => (
        <div className="distribution-row" key={row.value}>
          <span>{row.label}</span>
          <div className="distribution-track">
            <i style={{ width: `${row.ratio}%` }} />
          </div>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
};

const EmptyState = () => (
  <div className="empty-state">
    <Sparkles size={24} />
    <strong>没有匹配的新闻</strong>
    <span>调整关键词、主题或来源筛选后再试。</span>
  </div>
);

function App() {
  const { data, loading, refreshing, error, lastCheckedAt, reload } = useNewsFeed();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("全部");
  const [sourceType, setSourceType] = useState("全部");
  const [sort, setSort] = useState<SortMode>("latest");
  const timelineRef = useRef<HTMLDivElement>(null);

  const topicOptions = useMemo(() => ["全部", ...(data?.topics.map((item) => item.name) || [])], [data?.topics]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return filterItems(data.items, query, topic, sourceType, "全部", sort);
  }, [data, query, sort, sourceType, topic]);

  const groups = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  useEffect(() => {
    if (!timelineRef.current || loading) return undefined;
    return mountTimelineMotion(timelineRef.current);
  }, [filteredItems.length, loading, sort]);

  const latestItem = filteredItems[0];
  const hottestItem = useMemo(
    () => filteredItems.reduce<NewsItem | null>((best, item) => (!best || item.heat > best.heat ? item : best), null),
    [filteredItems]
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="人工智能热点时间线首页">
          <span className="brand-mark">智</span>
          <span>
            <strong>人工智能热点时间线</strong>
            <small>每半小时自动更新</small>
          </span>
        </a>

        <div className="topbar-status">
          <span className="live-indicator">
            <Radio size={15} />
            自动检查
          </span>
          <span>{data ? `最近生成 ${formatDateTime(data.generatedAt)}` : "正在读取新闻源"}</span>
          <span>{lastCheckedAt ? `检查 ${formatClock(lastCheckedAt)}` : "等待首次检查"}</span>
          <button className="refresh-button" onClick={() => void reload()} disabled={loading}>
            <RefreshCcw size={16} className={refreshing ? "spin-icon" : ""} />
            {refreshing ? "同步中" : "刷新"}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="command-panel" aria-label="新闻筛选">
          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索大模型、芯片、监管、智能体..." />
          </div>

          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            {topicOptions.map((name) => (
              <option key={name} value={name}>
                {name === "全部" ? "全部主题" : name}
              </option>
            ))}
          </select>

          <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
            {sourceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="segmented" role="group" aria-label="排序方式">
            <button className={sort === "latest" ? "is-active" : ""} onClick={() => setSort("latest")}>
              最新
            </button>
            <button className={sort === "hot" ? "is-active" : ""} onClick={() => setSort("hot")}>
              最热
            </button>
          </div>
        </section>

        <section className="overview-grid" aria-label="概览">
          <StatCard icon={<Activity size={18} />} label="当前收录" value={data?.stats.total ?? "-"} />
          <StatCard icon={<Globe2 size={18} />} label="新闻源" value={data?.stats.sourceCount ?? "-"} />
          <StatCard icon={<Zap size={18} />} label="最高热度" value={hottestItem?.heat ?? "-"} />
          <StatCard icon={<Clock3 size={18} />} label="最新发布时间" value={latestItem ? formatClock(latestItem.publishedAt) : "-"} />
        </section>

        <div className="content-grid">
          <section className="timeline-panel" aria-label="人工智能新闻时间轴">
            <div className="panel-heading">
              <div>
                <h1>实时人工智能新闻时间轴</h1>
                <p>
                  {data
                    ? `${filteredItems.length} 条匹配结果，覆盖最近 ${data.stats.windowHours} 小时公开来源`
                    : "正在聚合公开来源"}
                </p>
              </div>
              <span className="scan-badge">实时</span>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}

            <div className="timeline" ref={timelineRef}>
              {loading && !data ? (
                Array.from({ length: 5 }).map((_, index) => <div className="skeleton-card" key={index} />)
              ) : groups.length ? (
                groups.map((group) => (
                  <section className="timeline-group" key={group.date}>
                    <div className="group-date">{formatGroupDate(group.items[0].publishedAt)}</div>
                    <div className="group-items">
                      {group.items.map((item) => (
                        <NewsCard key={item.id} item={item} fresh={item.id === latestItem?.id} />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </section>

          <aside className="insight-rail" aria-label="今日热度">
            <section className="rail-block">
              <div className="rail-heading">
                <span>
                  <Flame size={17} />
                  今日热度
                </span>
                <strong>{hottestItem?.heat ?? "-"}</strong>
              </div>
              <p>{hottestItem ? hottestItem.title : "等待新闻数据生成"}</p>
            </section>

            <section className="rail-block">
              <div className="rail-heading">
                <span>
                  <Sparkles size={17} />
                  主题排行
                </span>
              </div>
              <TopicRank topics={data?.topics || []} />
            </section>

            <section className="rail-block">
              <div className="rail-heading">
                <span>
                  <Globe2 size={17} />
                  来源结构
                </span>
              </div>
              <DistributionBars items={filteredItems} />
            </section>

            <section className="rail-block source-health">
              <div className="rail-heading">
                <span>
                  <Activity size={17} />
                  抓取状态
                </span>
                <strong>{data ? `${data.stats.sourcesSucceeded}/${data.stats.sourceCount}` : "-"}</strong>
              </div>
              <div className="health-list">
                {(data?.sources || []).slice(0, 7).map((source) => (
                  <span key={source.id} className={source.ok ? "is-ok" : "is-down"}>
                    {source.name}
                    <small>{source.itemCount}</small>
                  </span>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
