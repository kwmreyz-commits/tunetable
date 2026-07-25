/**
 * 表示用の文字列・時間フォーマット。
 * サーバー/クライアント双方から使うので副作用を持たせない。
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * YouTube Data APIのsnippetは `&amp;` `&#39;` のようにHTMLエスケープされた
 * 文字列を返す。そのまま描画すると実体参照が見えてしまうためデコードする。
 */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

// 「(Official Music Video)」「【MV】」のような定型のノイズ。
// テレビに大きく映すとき、曲名以外の情報は邪魔になる。
const TITLE_NOISE = [
  /[([【〔[]\s*(?:official\s*)?(?:music\s*)?(?:lyric\s*)?video\s*[)\]】〕\]]/gi,
  /[([【〔[]\s*official\s*(?:audio|visualizer|hd|mv|m\/v)?\s*[)\]】〕\]]/gi,
  /[([【〔[]\s*(?:mv|m\/v|pv|hd|hq|4k|full\s*ver\.?|short\s*ver\.?)\s*[)\]】〕\]]/gi,
  /[([【〔[]\s*(?:リリック|リリックビデオ|ミュージックビデオ|公式|字幕付き)\s*[)\]】〕\]]/g,
];

/**
 * 動画タイトルから定型の飾りを落として読みやすくする。
 * 元の情報を失わせないよう、削りすぎた場合は元文字列に戻す。
 */
export function cleanTrackTitle(rawTitle: string): string {
  const decoded = decodeHtmlEntities(rawTitle);
  let cleaned = decoded;
  for (const pattern of TITLE_NOISE) {
    cleaned = cleaned.replace(pattern, " ");
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/[\s\-–—|/]+$/u, "").trim();
  return cleaned.length >= 2 ? cleaned : decoded.trim();
}

/** YouTubeのチャンネル名末尾の「 - Topic」(自動生成チャンネル)を落とす */
export function cleanChannelTitle(rawChannelTitle: string): string {
  return decodeHtmlEntities(rawChannelTitle).replace(/\s*-\s*Topic$/i, "").trim();
}

/** ISO 8601 duration (PT3M42S) を秒に変換する。解析できなければ0 */
export function parseIso8601Duration(value: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

/** 秒を 3:42 / 1:02:03 形式にする。0以下なら null(表示しない) */
export function formatDuration(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  const total = Math.round(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  return `${hours > 0 ? `${hours}:` : ""}${mm}:${String(seconds).padStart(2, "0")}`;
}

/** キューの合計時間をざっくり伝える。「残り約32分」の "約32分" 部分 */
export function formatRoughDuration(totalSeconds: number): string | null {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return "1分未満";
  if (minutes < 60) return `約${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `約${hours}時間` : `約${hours}時間${rest}分`;
}

/**
 * アンビエント背景・大画面表示用のサムネイル。
 * 検索APIが返すのは medium(320px) なので、大きく出すときは hq を組み立てる。
 * maxres は存在しない動画も多いため hq(480px) を既定にする。
 */
export function youtubeThumbnail(
  videoId: string,
  size: "hq" | "mq" = "hq",
): string {
  return `https://i.ytimg.com/vi/${videoId}/${size}default.jpg`;
}
