"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

interface QueueItem {
  id: string;
  track_name: string;
  artist_name: string;
  video_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  voteCount: number;
}

export function SessionPlayer({
  sessionId,
  joinCode,
  joinUrl,
  initialVideoId,
}: {
  sessionId: string;
  joinCode: string;
  joinUrl: string;
  initialVideoId: string | null;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);

  const refreshQueue = useCallback(async () => {
    const supabase = createClient();

    const { data: requests } = await supabase
      .from("requests")
      .select("id, track_name, artist_name, video_id, thumbnail_url, created_at")
      .eq("session_id", sessionId)
      .eq("status", "queued");

    const rows = requests ?? [];
    const ids = rows.map((row) => row.id);

    let votes: { request_id: string }[] = [];
    if (ids.length > 0) {
      const { data } = await supabase.from("votes").select("request_id").in("request_id", ids);
      votes = data ?? [];
    }

    const sorted = rows
      .map((row) => ({
        ...row,
        voteCount: votes.filter((vote) => vote.request_id === row.id).length,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.created_at.localeCompare(b.created_at);
      });

    setQueue(sorted);
  }, [sessionId]);

  const playNext = useCallback(async () => {
    const supabase = createClient();

    const { data: requests } = await supabase
      .from("requests")
      .select("id, video_id, status, created_at")
      .eq("session_id", sessionId)
      .in("status", ["queued", "playing"]);

    const rows = requests ?? [];
    const playing = rows.find((row) => row.status === "playing");
    const queued = rows
      .filter((row) => row.status === "queued")
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    if (queued.length === 0) {
      await refreshQueue();
      return;
    }

    const queuedIds = queued.map((row) => row.id);
    const { data: votes } = await supabase
      .from("votes")
      .select("request_id")
      .in("request_id", queuedIds);

    const counts = new Map<string, number>();
    for (const vote of votes ?? []) {
      counts.set(vote.request_id, (counts.get(vote.request_id) ?? 0) + 1);
    }

    const next = [...queued].sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
    )[0];

    if (playing) {
      await supabase.from("requests").update({ status: "played" }).eq("id", playing.id);
    }
    await supabase.from("requests").update({ status: "playing" }).eq("id", next.id);
    await supabase
      .from("sessions")
      .update({
        now_playing_video_id: next.video_id,
        now_playing_started_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (next.video_id) {
      playerRef.current?.loadVideoById(next.video_id);
    }

    await refreshQueue();
  }, [sessionId, refreshQueue]);

  useEffect(() => {
    function createPlayer() {
      playerRef.current = new window.YT.Player("youtube-player", {
        videoId: initialVideoId ?? undefined,
        playerVars: { autoplay: 0, controls: 1, rel: 0 },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              playNext();
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create the player once on mount
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + realtime subscription on mount
    refreshQueue();

    const supabase = createClient();
    const channel = supabase
      .channel(`session-player-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `session_id=eq.${sessionId}` },
        refreshQueue,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, refreshQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refreshQueue]);

  async function removeFromQueue(requestId: string) {
    const supabase = createClient();
    await supabase.from("requests").update({ status: "removed" }).eq("id", requestId);
    await refreshQueue();
  }

  function handleStart() {
    if (initialVideoId) {
      playerRef.current?.playVideo();
    } else {
      playNext();
    }
    setIsStarted(true);
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-zinc-500">
            ← ダッシュボードに戻る
          </Link>
          <span className="font-mono text-sm text-zinc-500">参加コード: {joinCode}</span>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-[2fr_1fr]">
          <div>
            <div id="youtube-player" className="aspect-video w-full rounded-lg bg-black" />

            {!isStarted && (
              <button
                type="button"
                onClick={handleStart}
                disabled={!isReady}
                className="mt-3 w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                再生開始
              </button>
            )}
          </div>

          <div className="flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-4">
            <QRCodeSVG value={joinUrl} size={160} />
            <p className="mt-2 break-all text-center text-xs text-zinc-500">{joinUrl}</p>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-medium text-zinc-500">キュー</h2>
        <ul className="mt-3 space-y-2">
          {queue.length === 0 && <li className="text-sm text-zinc-400">キューは空です</li>}
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            >
              {item.thumbnail_url && (
                <Image
                  src={item.thumbnail_url}
                  alt={item.track_name}
                  width={64}
                  height={48}
                  className="h-12 w-16 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{item.track_name}</p>
                <p className="truncate text-xs text-zinc-500">{item.artist_name}</p>
              </div>
              <span className="text-sm font-medium text-zinc-700">{item.voteCount}票</span>
              <button
                type="button"
                onClick={() => removeFromQueue(item.id)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-500"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
