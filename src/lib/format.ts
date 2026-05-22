export const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

export const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit"
});

export const groupDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  day: "numeric",
  weekday: "short"
});

export const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

export const formatClock = (value: string) => timeFormatter.format(new Date(value));

export const formatRelative = (value: string) => {
  const date = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round((Date.now() - date) / 60000));
  if (diffMinutes < 2) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  return `${days} 天前`;
};

export const formatGroupDate = (value: string) => groupDateFormatter.format(new Date(value));

export const sourceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    official: "官方",
    media: "媒体",
    search: "全网",
    research: "论文"
  };
  return labels[type] || type;
};
