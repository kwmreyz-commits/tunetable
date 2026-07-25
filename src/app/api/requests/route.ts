import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { YouTubeProvider } from "@/lib/music-provider/youtube";
import {
  MAX_QUEUE_LENGTH,
  REQUEST_WINDOW_MINUTES,
  REQUESTS_PER_WINDOW,
} from "@/lib/party-rules";

/**
 * リクエスト受付。
 *
 * v2では参加者のブラウザから直接 `requests` にinsertしていたため、
 * レート制限が実質チェックにならず(localStorageを消せば回避できる)、
 * 曲名や長さもクライアントの申告値をそのまま保存していた。
 * 受付をここに集約して、以下をサーバー側で担保する:
 *
 *  - 5分3曲のレート制限
 *  - キュー総数の上限
 *  - ホストが設定したNGワード
 *  - 動画の実在・埋め込み可否(YouTubeに引き直す)
 *  - すでにキューにある動画は「投票」に振り替える
 */

const bodySchema = z.object({
  joinCode: z.string().trim().min(1).max(16),
  videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
  anonymousId: z.string().trim().min(8).max(64),
});

function containsNgWord(text: string, ngWords: string[]): string | null {
  const haystack = text.toLowerCase();
  for (const word of ngWords) {
    const needle = word.trim().toLowerCase();
    if (needle.length > 0 && haystack.includes(needle)) return word;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "リクエストの内容が不正です" }, { status: 400 });
  }
  const { joinCode, videoId, anonymousId } = parsed.data;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "サーバーの設定が不足しています" },
      { status: 500 },
    );
  }

  const supabase = createServiceRoleClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, store_id")
    .eq("join_code", joinCode)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json(
      { error: "セッションが終了しているか、参加コードが正しくありません" },
      { status: 404 },
    );
  }

  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60 * 1000).toISOString();

  const [{ count: recentByGuest }, { count: queueLength }] = await Promise.all([
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("requested_by", anonymousId)
      .gte("created_at", windowStart),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("status", "queued"),
  ]);

  if ((recentByGuest ?? 0) >= REQUESTS_PER_WINDOW) {
    return NextResponse.json(
      {
        error: `リクエストは${REQUEST_WINDOW_MINUTES}分間に${REQUESTS_PER_WINDOW}曲までです。少し待ってからもう一度お試しください`,
        code: "RATE_LIMITED",
      },
      { status: 429 },
    );
  }

  if ((queueLength ?? 0) >= MAX_QUEUE_LENGTH) {
    return NextResponse.json(
      { error: "キューがいっぱいです。少し流れてからもう一度お試しください", code: "QUEUE_FULL" },
      { status: 429 },
    );
  }

  // すでにキュー/再生中にある動画は、二重登録ではなく投票として扱う。
  // 「もう入ってます」と突き返されるより、票が入ったほうが意図に沿う。
  const { data: existing } = await supabase
    .from("requests")
    .select("id, status")
    .eq("session_id", session.id)
    .eq("video_id", videoId)
    .in("status", ["queued", "playing"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === "playing") {
      return NextResponse.json({
        deduped: true,
        votedRequestId: null,
        message: "その動画はいま再生中です",
      });
    }
    await supabase
      .from("votes")
      .insert({ request_id: existing.id, voter_anonymous_id: anonymousId });
    return NextResponse.json({
      deduped: true,
      votedRequestId: existing.id,
      message: "すでにキューにあったので、代わりに投票しました",
    });
  }

  const provider = new YouTubeProvider(apiKey);
  const track = await provider.lookup(videoId).catch(() => null);
  if (!track) {
    return NextResponse.json(
      { error: "この動画は再生できないためリクエストできません", code: "NOT_PLAYABLE" },
      { status: 422 },
    );
  }

  const { data: store } = await supabase
    .from("stores")
    .select("ng_words")
    .eq("id", session.store_id)
    .maybeSingle();

  const ngWords = store?.ng_words ?? [];
  const hit = containsNgWord(`${track.title} ${track.channelTitle}`, ngWords);
  if (hit) {
    return NextResponse.json(
      { error: "この動画はホストの設定によりリクエストできません", code: "BLOCKED" },
      { status: 422 },
    );
  }

  const { data: inserted, error } = await supabase
    .from("requests")
    .insert({
      session_id: session.id,
      // 初期スキーマの列。NOT NULL かつ「同一セッションで同じ曲を二重に
      // キューさせない」unique indexがこの列に張られているため、
      // YouTubeの動画IDを入れて制約をそのまま活かす。
      spotify_track_id: track.videoId,
      track_name: track.title,
      artist_name: track.channelTitle,
      duration_ms: track.durationSeconds * 1000,
      requested_by: anonymousId,
      video_id: track.videoId,
      thumbnail_url: track.thumbnailUrl,
    })
    .select("id")
    .single();

  if (error) {
    // unique制約(同一動画の同時キュー)に負けた場合は投票に振り替える
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("requests")
        .select("id")
        .eq("session_id", session.id)
        .eq("video_id", videoId)
        .eq("status", "queued")
        .limit(1)
        .maybeSingle();
      if (raced) {
        await supabase
          .from("votes")
          .insert({ request_id: raced.id, voter_anonymous_id: anonymousId });
        return NextResponse.json({
          deduped: true,
          votedRequestId: raced.id,
          message: "すでにキューにあったので、代わりに投票しました",
        });
      }
    }
    return NextResponse.json({ error: "リクエストに失敗しました" }, { status: 500 });
  }

  return NextResponse.json({
    requestId: inserted.id,
    message: "キューに追加しました",
  });
}
