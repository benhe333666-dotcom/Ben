import type { NewsItem } from "../types/news";

export const filterItems = (
  items: NewsItem[],
  query: string,
  topic: string,
  sourceType: string,
  sourceId: string,
  language: string,
  sort: "latest" | "hot"
) => {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const queryMatch =
      !normalizedQuery ||
      `${item.title} ${item.summary} ${item.source} ${item.topics.join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery);
    const topicMatch = topic === "全部" || item.topics.includes(topic);
    const sourceMatch = sourceType === "全部" || item.sourceType === sourceType;
    const sourceIdMatch = sourceId === "全部" || item.sourceId === sourceId;
    const languageMatch = language === "全部" || item.language === language;
    return queryMatch && topicMatch && sourceMatch && sourceIdMatch && languageMatch;
  });

  if (sort === "hot") {
    return [...filtered].sort((a, b) => b.heat - a.heat || +new Date(b.publishedAt) - +new Date(a.publishedAt));
  }

  return filtered;
};

export const groupByDate = (items: NewsItem[]) =>
  items.reduce<Array<{ date: string; items: NewsItem[] }>>((groups, item) => {
    const date = new Date(item.publishedAt).toISOString().slice(0, 10);
    const group = groups[groups.length - 1]?.date === date ? groups[groups.length - 1] : null;
    if (group) group.items.push(item);
    else groups.push({ date, items: [item] });
    return groups;
  }, []);

export const sourceDistribution = (items: NewsItem[]) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
    return acc;
  }, {});
