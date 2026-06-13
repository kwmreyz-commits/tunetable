import { NextRequest, NextResponse } from "next/server";
import { YouTubeProvider } from "@/lib/music-provider/youtube";

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
  } catch {
    return NextResponse.json(
      { error: "動画検索に失敗しました" },
      { status: 502 },
    );
  }
}
