import { useCallback, useEffect, useState } from "react";
import type { NewsPayload } from "../types/news";

interface NewsState {
  data: NewsPayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  lastCheckedAt: string;
}

export const useNewsFeed = () => {
  const [state, setState] = useState<NewsState>({
    data: null,
    loading: true,
    refreshing: false,
    lastCheckedAt: "",
    error: ""
  });

  const load = useCallback(async (silent = false) => {
    setState((current) => ({ ...current, loading: !silent, refreshing: silent, error: "" }));
    try {
      const response = await fetch(`/news.json?ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`无法读取新闻数据：${response.status}`);
      const data = (await response.json()) as NewsPayload;
      setState({
        data,
        loading: false,
        refreshing: false,
        lastCheckedAt: new Date().toISOString(),
        error: ""
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        lastCheckedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "新闻数据加载失败"
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void load(true);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [load]);

  return {
    ...state,
    reload: load
  };
};
