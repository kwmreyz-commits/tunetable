declare namespace YT {
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    loadVideoById(videoId: string): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getPlayerState(): number;
    getCurrentTime(): number;
    getDuration(): number;
    destroy(): void;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: Record<string, number | string>;
    events?: {
      onReady?: (event: PlayerEvent) => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    };
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: number;
  }

  /**
   * 2: 動画IDが不正 / 5: HTML5プレーヤーで再生不可
   * 100: 動画が存在しない / 101,150: 埋め込み再生が許可されていない
   */
  interface OnErrorEvent extends PlayerEvent {
    data: number;
  }

  const PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
    UNSTARTED: number;
  };
}

interface Window {
  YT: typeof YT;
  onYouTubeIframeAPIReady: () => void;
}
