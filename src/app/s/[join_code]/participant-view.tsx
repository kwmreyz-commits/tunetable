"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getAnonymousId } from "@/lib/anonymous-id";
import { SearchModal } from "./search-modal";
import type { TrackResult } from "@/lib/music-provider/types";

interface RequestRow {
  id: string;
  track_name: string;
  artist_name: string;
  video_id: string | null;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
}

interface QueueItem extends RequestRow {
  voteCount: number;
  hasVoted: boolean;
}

interface NowPlaying {
  trackName: string;
  artistName: string;
  thumbnailUrl: string | null;
}

export function ParticipantView({
  sessionId,
  storeName,
}: {
  sessionId: string;
  storeName: string;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const currentAnonId = getAnonymousId();

    const { data: session } = await supabase
      .from("sessions")
      .select("now_playing_video_id")
      .eq("id", sessionId)
      .single();

    const { data: requests } = await supabase
      .from("requests")
      .select("id, track_name, artist_name, video_id, thumbnail_url, status, created_at")
      .eq("session_id", sessionId)
      .in("status", ["queued", "playing"]);

    const rows = (requests ?? []) as RequestRow[];
    const requestIds = rows.map((row) => row.id);

    let votes: { request_id: string; voter_anonymous_id: string }[] = [];
    if (requestIds.length > 0) {
      const { data } = await supabase
        .from("votes")
        .select("request_id, voter_anonymous_id")
        .in("request_id", requestIds);
      votes = data ?? [];
    }

    const queued = rows
      .filter((row) => row.status === "queued")
      .map((row) => {
        const rowVotes = votes.filter((vote) => vote.request_id === row.id);
        return {
          ...row,
          voteCount: rowVotes.length,
          hasVoted: rowVotes.some((vote) => vote.voter_anonymous_id === currentAnonId),
        };
      })
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.created_at.localeCompare(b.created_at);
      });

    setQueue(queued);

    const playing = rows.find(
      (row) => row.status === "playing" && row.video_id === session?.now_playing_video_id,
    );
    setNowPlaying(
      playing
        ? {
            trackName: playing.track_name,
            artistName: playing.artist_name,
            thumbnailUrl: playing.thumbnail_url,
          }
        : null,
    );
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + realtime subscription on mount
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `session_id=eq.${sessionId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  async function toggleVote(requestId: string, hasVoted: boolean) {
    const supabase = createClient();
    const voterAnonymousId = getAnonymousId();
    if (hasVoted) {
      await supabase
        .from("votes")
        .delete()
        .eq("request_id", requestId)
        .eq("voter_anonymous_id", voterAnonymousId);
    } else {
      await supabase
        .from("votes")
        .insert({ request_id: requestId, voter_anonymous_id: voterAnonymousId });
    }
    await refresh();
  }

  async function handleSelectTrack(track: TrackResult) {
    setIsSearchOpen(false);
    const supabase = createClient();
    const anonymousId = getAnonymousId();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("requested_by", anonymousId)
      .gte("created_at", fiveMinutesAgo);

    if ((count ?? 0) >= 3) {
      setMessage("リクエストは5分間に3曲までです。しばらく待ってから試してください");
      return;
    }

    const { error } = await supabase.from("requests").insert({
      session_id: sessionId,
      spotify_track_id: track.videoId,
      track_name: track.title,
      artist_name: track.channelTitle,
      album_art_url: track.thumbnailUrl,
      duration_ms: 0,
      requested_by: anonymousId,
      video_id: track.videoId,
      thumbnail_url: track.thumbnailUrl,
    });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "この動画はすでにキューに追加されています"
          : "リクエストに失敗しました",
      );
    } else {
      setMessage("キューに追加しました");
    }
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-xl font-bold text-zinc-900">{storeName}</h1>

        <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-medium text-zinc-500">現在再生中</h2>
          {nowPlaying ? (
            <div className="mt-2 flex items-center gap-3">
              {nowPlaying.thumbnailUrl && (
                <Image
                  src={nowPlaying.thumbnailUrl}
                  alt={nowPlaying.trackName}
                  width={80}
                  height={60}
                  className="h-15 w-20 rounded object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{nowPlaying.trackName}</p>
                <p className="truncate text-sm text-zinc-500">{nowPlaying.artistName}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">再生中の動画はありません</p>
          )}
        </section>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">キュー</h2>
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            リクエスト
          </button>
        </div>

        {message && <p className="mt-2 text-sm text-zinc-500">{message}</p>}

        <ul className="mt-3 space-y-2">
          {queue.length === 0 && (
            <li className="text-sm text-zinc-400">キューは空です</li>
          )}
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
              <button
                type="button"
                onClick={() => toggleVote(item.id, item.hasVoted)}
                className={`flex flex-col items-center rounded-lg border px-3 py-1 text-sm font-medium ${
                  item.hasVoted
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 text-zinc-700"
                }`}
              >
                <span>▲</span>
                <span>{item.voteCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {isSearchOpen && (
        <SearchModal onClose={() => setIsSearchOpen(false)} onSelect={handleSelectTrack} />
      )}
    </div>
  );
}
