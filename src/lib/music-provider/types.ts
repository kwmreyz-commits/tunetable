export interface TrackResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  /** 動画の長さ(秒)。取得できなかった場合は0 */
  durationSeconds: number;
}

export interface MusicProvider {
  search(query: string): Promise<TrackResult[]>;
  /** 単一動画のメタデータ。リクエスト受付時の検証に使う */
  lookup(videoId: string): Promise<TrackResult | null>;
}
