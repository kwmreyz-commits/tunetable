import type { MusicProvider, TrackResult } from "./types";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10分キャッシュしてクォータを節約

interface CacheEntry {
  expiresAt: number;
  results: TrackResult[];
}

const cache = new Map<string, CacheEntry>();

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

export class YouTubeProvider implements MusicProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: string): Promise<TrackResult[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.results;
    }

    const url = new URL(SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("q", query);
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`YouTube検索に失敗しました (status: ${response.status})`);
    }

    const data = (await response.json()) as YouTubeSearchResponse;
    const results: TrackResult[] = data.items
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          "",
      }));

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, results });
    return results;
  }
}
