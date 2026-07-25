import { NextResponse, type NextRequest } from "next/server";
import { YouTubeApiError, YouTubeProvider } from "@/lib/music-provider/youtube";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "検索キーワードを入力してください" },
      { status: 400 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEYが設定されていません" },
      { status: 500 },
    );
  }

  try {
    const provider = new YouTubeProvider(apiKey);
    const results = await provider.search(query);
    return NextResponse.json({ results });
  } catch (error) {
    // 原因によってホスト側の打ち手が変わる(待つ / 設定を直す)ので切り分ける
    if (error instanceof YouTubeApiError) {
      if (error.isQuotaExceeded) {
        return NextResponse.json(
          {
            error: "本日の検索回数の上限に達しました。時間をおいてお試しください",
            code: "QUOTA_EXCEEDED",
          },
          { status: 429 },
        );
      }
      if (error.isKeyProblem) {
        console.error("[api/search] YouTube API key rejected:", error.message);
        return NextResponse.json(
          { error: "検索機能の設定に問題があります", code: "CONFIG_ERROR" },
          { status: 500 },
        );
      }
      console.error("[api/search]", error.message);
    } else {
      console.error("[api/search] unexpected error:", error);
    }
    return NextResponse.json({ error: "動画検索に失敗しました" }, { status: 502 });
  }
}
