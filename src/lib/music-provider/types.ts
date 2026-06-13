export interface TrackResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

export interface MusicProvider {
  search(query: string): Promise<TrackResult[]>;
}
