import { youtubeThumbnail } from "@/lib/format";

/**
 * 再生中の動画のサムネイルを大きくぼかして背景に敷く。
 *
 * ホスト画面はテレビに映して置きっぱなしにされるので、
 * 「ただの黒い画面」ではなく曲ごとに部屋の色が変わるアンビエント表示にしたい。
 * next/imageを通す必要はない(装飾であり、レイアウトも取らない)ので
 * CSSのbackground-imageで軽く済ませる。
 */
export function AmbientBackdrop({
  videoId,
  intensity = "full",
}: {
  videoId: string | null;
  intensity?: "full" | "subtle";
}) {
  const isSubtle = intensity === "subtle";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 何も流れていないときのベース。完全な黒より奥行きが出る */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #1d1030 0%, #0a0711 55%, #07050d 100%)",
        }}
      />

      {videoId && (
        <div
          key={videoId}
          className="animate-fade-in absolute inset-0"
          style={{
            backgroundImage: `url(${youtubeThumbnail(videoId)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: `blur(${isSubtle ? 64 : 88}px) saturate(1.5)`,
            transform: "scale(1.35)",
            opacity: isSubtle ? 0.3 : 0.45,
          }}
        />
      )}

      {/* 上に載るテキストのコントラストを確保するための減光 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,7,17,.55) 0%, rgba(10,7,17,.78) 45%, rgba(10,7,17,.94) 100%)",
        }}
      />
    </div>
  );
}
