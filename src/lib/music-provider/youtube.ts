import {
  cleanChannelTitle,
  cleanTrackTitle,
  parseIso8601Duration,
} from "@/lib/format";
import type { MusicProvider, TrackResult } from "./types";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/**
 * YouTube Data APIの無料枠は1日10,000ユニット、search.listは1回100ユニット
 * (=1日100回)しかない。パーティー1回で参加者が検索する回数を考えると
 * これは現実的な制約なので、二段でキャッシュする。
 *
 * L1: プロセス内Map。同じインスタンスに連続で当たったときに効く。
 * L2: Next.jsのData Cache(`force-cache` + `revalidate`)。
 *     Vercel上ではインスタンスを跨いで共有されるので、L1しか無かった
 *     v2の実装と違って実際にクォータを節約できる。
 */
const SEARCH_TTL_MS = 10 * 60 * 1000;
const SEARCH_REVALIDATE_SEC = 60 * 60;
const LOOKUP_REVALIDATE_SEC = 24 * 60 * 60;

interface CacheEntry {
  expiresAt: number;
  results: TrackResult[];
}

/**
 * 呼び出し側でクォータ超過とAPIキー不正を切り分けられるようにする。
 * 「動画検索に失敗しました」だけでは原因の特定に時間がかかるため。
 */
export class YouTubeApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
  ) {
    super(`YouTube API error (status: ${status}, reason: ${reason ?? "unknown"})`);
    this.name = "YouTubeApiError";
  }

  get isQuotaExceeded(): boolean {
    return this.status === 403 && this.reason === "quotaExceeded";
  }

  get isKeyProblem(): boolean {
    return this.status === 400 || this.reason === "keyInvalid";
  }
}

async function readErrorReason(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as {
      error?: { errors?: { reason?: string }[] };
    };
    return body.error?.errors?.[0]?.reason ?? null;
  } catch {
    return null;
  }
}

const memoryCache = new Map<string, CacheEntry>();

interface Thumbnails {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
}

interface SearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Thumbnails;
  };
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Thumbnails;
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
}

function thumbnailOf(thumbnails: Thumbnails | undefined): string {
  return thumbnails?.medium?.url ?? thumbnails?.default?.url ?? "";
}

export class YouTubeProvider implements MusicProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: string): Promise<TrackResult[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.results;
    }

    const url = new URL(SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "12");
    url.searchParams.set("q", query);
    // 埋め込み再生できない動画をキューに入れられると、ホスト画面で再生が
    // 止まってパーティーが死ぬ。検索の段階で除外しておく。
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("videoSyndicated", "true");
    // 日本語の曲名・アーティスト名での検索精度を上げる
    url.searchParams.set("regionCode", "JP");
    url.searchParams.set("relevanceLanguage", "ja");
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: SEARCH_REVALIDATE_SEC },
    });
    if (!response.ok) {
      throw new YouTubeApiError(response.status, await readErrorReason(response));
    }

    const data = (await response.json()) as { items?: SearchItem[] };
    const items = data.items ?? [];
    const videoIds = items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    const durations = await this.fetchDurations(videoIds);

    const results: TrackResult[] = items.flatMap((item) => {
      const videoId = item.id?.videoId;
      if (!videoId) return [];
      return [
        {
          videoId,
          title: cleanTrackTitle(item.snippet?.title ?? ""),
          channelTitle: cleanChannelTitle(item.snippet?.channelTitle ?? ""),
          thumbnailUrl: thumbnailOf(item.snippet?.thumbnails),
          durationSeconds: durations.get(videoId) ?? 0,
        },
      ];
    });

    memoryCache.set(cacheKey, {
      expiresAt: Date.now() + SEARCH_TTL_MS,
      results,
    });
    return results;
  }

  /**
   * videos.listは1回1ユニットしか使わないので、検索結果の長さをまとめて
   * 引くのは事実上無料。キューの残り時間表示に使う。
   */
  private async fetchDurations(videoIds: string[]): Promise<Map<string, number>> {
    const durations = new Map<string, number>();
    if (videoIds.length === 0) return durations;

    const url = new URL(VIDEOS_URL);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", videoIds.join(","));
    url.searchParams.set("key", this.apiKey);

    try {
      const response = await fetch(url, {
        cache: "force-cache",
        next: { revalidate: LOOKUP_REVALIDATE_SEC },
      });
      if (!response.ok) return durations;
      const data = (await response.json()) as { items?: VideoItem[] };
      for (const item of data.items ?? []) {
        if (!item.id) continue;
        durations.set(
          item.id,
          parseIso8601Duration(item.contentDetails?.duration ?? ""),
        );
      }
    } catch {
      // 長さは付加情報。取れなくても検索結果自体は返す
    }
    return durations;
  }

  /**
   * リクエスト受付時にサーバー側で動画の実体を確認する。
   * クライアントから送られてきたタイトルや長さは信用せず、ここで引き直す。
   */
  async lookup(videoId: string): Promise<TrackResult | null> {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    const url = new URL(VIDEOS_URL);
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", this.apiKey);

    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: LOOKUP_REVALIDATE_SEC },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { items?: VideoItem[] };
    const item = data.items?.[0];
    if (!item?.id) return null;
    // 埋め込み不可・非公開の動画はキューに入れさせない
    if (item.status?.embeddable === false) return null;
    if (item.status?.privacyStatus === "private") return null;

    return {
      videoId: item.id,
      title: cleanTrackTitle(item.snippet?.title ?? ""),
      channelTitle: cleanChannelTitle(item.snippet?.channelTitle ?? ""),
      thumbnailUrl: thumbnailOf(item.snippet?.thumbnails),
      durationSeconds: parseIso8601Duration(item.contentDetails?.duration ?? ""),
    };
  }
}
