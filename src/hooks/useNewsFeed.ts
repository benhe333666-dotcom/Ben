import { useCallback, useEffect, useState } from "react";
import type { NewsPayload } from "../types/news";

const REFRESH_INTERVAL_MS = 30_000;
const UPDATE_HINT_GRACE_MS = 5_000;

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
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const refreshWhenActive = () => {
      if (!document.hidden) void load(true);
    };

    document.addEventListener("visibilitychange", refreshWhenActive);
    window.addEventListener("focus", refreshWhenActive);
    window.addEventListener("online", refreshWhenActive);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenActive);
      window.removeEventListener("focus", refreshWhenActive);
      window.removeEventListener("online", refreshWhenActive);
    };
  }, [load]);

  useEffect(() => {
    const nextUpdateAt = state.data?.nextUpdateHint ? new Date(state.data.nextUpdateHint).getTime() : 0;
    if (!Number.isFinite(nextUpdateAt) || nextUpdateAt <= 0) return undefined;

    const delay = Math.max(REFRESH_INTERVAL_MS, nextUpdateAt - Date.now() + UPDATE_HINT_GRACE_MS);
    const timeout = window.setTimeout(() => {
      void load(true);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [load, state.data?.nextUpdateHint]);

  return {
    ...state,
    reload: load
  };
};
