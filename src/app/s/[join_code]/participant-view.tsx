"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getAnonymousId } from "@/lib/anonymous-id";
import { pseudonymFor } from "@/lib/identity";
import { formatDuration, formatRoughDuration } from "@/lib/format";
import { SKIP_VOTE_THRESHOLD } from "@/lib/party-rules";
import { usePresenceCount } from "@/lib/use-presence";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
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
  duration_ms: number;
  requested_by: string;
}

interface VoteRow {
  request_id: string;
  voter_anonymous_id: string;
  created_at: string;
}

interface QueueItem extends RequestRow {
  voteCount: number;
  hasVoted: boolean;
}

interface PlayingState extends RequestRow {
  startedAt: string | null;
  skipVotes: number;
  hasVotedSkip: boolean;
}

/**
 * 匿名IDはlocalStorage(=Reactの外の状態)にあり、サーバー描画時には存在しない。
 * effectで読むとカスケードレンダリングになり、描画中に読むと
 * ハイドレーション不一致になるので、外部ストアとして購読する。
 */
const subscribeToNothing = () => () => {};

function useAnonymousId(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => getAnonymousId(),
    () => null,
  );
}

export function ParticipantView({
  sessionId,
  joinCode,
  storeName,
}: {
  sessionId: string;
  joinCode: string;
  storeName: string;
}) {
  const anonymousId = useAnonymousId();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useMemo(
    () => (anonymousId ? pseudonymFor(anonymousId) : null),
    [anonymousId],
  );

  // ホスト画面の「参加中」人数に自分を含めるため、参加者側は自分をtrackする
  usePresenceCount(sessionId, anonymousId, true);

  const notify = useCallback((text: string) => {
    setMessage(text);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const currentAnonId = getAnonymousId();

    // RLSはactiveなセッションしか読ませないので、nullが返ったら
    // ホストがパーティーを終了したということ。
    const { data: session } = await supabase
      .from("sessions")
      .select("now_playing_video_id, now_playing_started_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      setHasEnded(true);
      return;
    }

    const { data: requests } = await supabase
      .from("requests")
      .select(
        "id, track_name, artist_name, video_id, thumbnail_url, status, created_at, duration_ms, requested_by",
      )
      .eq("session_id", sessionId)
      .in("status", ["queued", "playing"]);

    const rows = (requests ?? []) as RequestRow[];
    const requestIds = rows.map((row) => row.id);

    let votes: VoteRow[] = [];
    if (requestIds.length > 0) {
      const { data } = await supabase
        .from("votes")
        .select("request_id, voter_anonymous_id, created_at")
        .in("request_id", requestIds);
      votes = data ?? [];
    }

    setQueue(
      rows
        .filter((row) => row.status === "queued")
        .map((row) => {
          const rowVotes = votes.filter((vote) => vote.request_id === row.id);
          return {
            ...row,
            voteCount: rowVotes.length,
            hasVoted: rowVotes.some(
              (vote) => vote.voter_anonymous_id === currentAnonId,
            ),
          };
        })
        .sort((a, b) => {
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return a.created_at.localeCompare(b.created_at);
        }),
    );

    // now_playing_video_id と一致する行を優先するが、同期が一瞬ずれても
    // 「再生中なのに何も出ない」状態にならないよう playing 行でフォールバックする
    const playingRows = rows.filter((row) => row.status === "playing");
    const current =
      playingRows.find((row) => row.video_id === session.now_playing_video_id) ??
      playingRows[0] ??
      null;

    if (!current) {
      setPlaying(null);
      return;
    }

    // スキップ投票は「その曲が流れ始めてから入った票」だけを数える。
    // キューにいる間に集めた票は再生する理由であって、飛ばす理由ではない。
    const startedAt = session.now_playing_started_at;
    const startedAtMs = startedAt ? Date.parse(startedAt) : 0;
    const skipVoteRows = votes.filter(
      (vote) =>
        vote.request_id === current.id && Date.parse(vote.created_at) > startedAtMs,
    );

    setPlaying({
      ...current,
      startedAt,
      skipVotes: skipVoteRows.length,
      hasVotedSkip: skipVoteRows.some(
        (vote) => vote.voter_anonymous_id === currentAnonId,
      ),
    });
  }, [sessionId]);

  /**
   * Realtimeは1つの変更で何度も飛んでくる(requests更新とvotes更新が
   * 連続するなど)。そのたびに全件取り直すと通信が跳ねるのでまとめる。
   */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refresh();
    }, 220);
  }, [refresh]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回取得とRealtime購読
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `session_id=eq.${sessionId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        scheduleRefresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, refresh, scheduleRefresh]);

  // 進捗バー用の時計。再生中でないときは動かさない
  useEffect(() => {
    if (!playing?.startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [playing?.startedAt]);

  const elapsedSeconds = playing?.startedAt
    ? Math.max(0, Math.floor((now - Date.parse(playing.startedAt)) / 1000))
    : 0;
  const playingDurationSeconds = playing ? Math.round(playing.duration_ms / 1000) : 0;
  const progress =
    playingDurationSeconds > 0
      ? Math.min(1, elapsedSeconds / playingDurationSeconds)
      : 0;

  const queueSeconds = queue.reduce(
    (total, item) => total + Math.round(item.duration_ms / 1000),
    0,
  );

  async function toggleVote(item: QueueItem) {
    const supabase = createClient();
    const voterAnonymousId = getAnonymousId();
    const nextVoted = !item.hasVoted;

    // 暗い部屋で片手操作している人に通信待ちを見せたくないので先に反映する
    setQueue((previous) =>
      previous
        .map((row) =>
          row.id === item.id
            ? {
                ...row,
                hasVoted: nextVoted,
                voteCount: row.voteCount + (nextVoted ? 1 : -1),
              }
            : row,
        )
        .sort((a, b) => {
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return a.created_at.localeCompare(b.created_at);
        }),
    );

    const { error } = nextVoted
      ? await supabase
          .from("votes")
          .insert({ request_id: item.id, voter_anonymous_id: voterAnonymousId })
      : await supabase
          .from("votes")
          .delete()
          .eq("request_id", item.id)
          .eq("voter_anonymous_id", voterAnonymousId);

    if (error) notify("投票を反映できませんでした");
    scheduleRefresh();
  }

  async function toggleSkipVote() {
    if (!playing) return;
    const supabase = createClient();
    const voterAnonymousId = getAnonymousId();
    const nextVoted = !playing.hasVotedSkip;

    setPlaying((previous) =>
      previous
        ? {
            ...previous,
            hasVotedSkip: nextVoted,
            skipVotes: previous.skipVotes + (nextVoted ? 1 : -1),
          }
        : previous,
    );

    const { error } = nextVoted
      ? await supabase
          .from("votes")
          .insert({ request_id: playing.id, voter_anonymous_id: voterAnonymousId })
      : await supabase
          .from("votes")
          .delete()
          .eq("request_id", playing.id)
          .eq("voter_anonymous_id", voterAnonymousId);

    if (error) notify("スキップ投票を反映できませんでした");
    scheduleRefresh();
  }

  async function handleSelectTrack(track: TrackResult) {
    setIsSearchOpen(false);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode,
          videoId: track.videoId,
          anonymousId: getAnonymousId(),
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      notify(data.message ?? data.error ?? "リクエストしました");
    } catch {
      notify("通信に失敗しました。電波の良い場所でもう一度お試しください");
    } finally {
      setIsSubmitting(false);
      scheduleRefresh();
    }
  }

  if (hasEnded) {
    return (
      <>
        <AmbientBackdrop videoId={null} />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-4 text-xl font-bold">パーティーは終了しました</h1>
          <p className="mt-2 text-sm text-ink-muted">
            参加ありがとうございました。この曲たちの記録を見られます。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-surface-strong px-6 py-3 text-sm font-medium"
          >
            この会のプレイリストを見る
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <AmbientBackdrop videoId={playing?.video_id ?? null} />

      <div className="flex flex-1 flex-col px-5 pt-6 pb-36">
        <div className="mx-auto w-full max-w-md">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-widest text-ink-faint">
                TUNETABLE
              </p>
              <h1 className="truncate text-lg font-bold">{storeName || "パーティー"}</h1>
            </div>
            {me && (
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-surface px-3 py-1.5">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                  style={{ background: me.color }}
                  aria-hidden
                >
                  {me.emoji}
                </span>
                <span className="text-xs text-ink-muted">{me.name}</span>
              </div>
            )}
          </header>

          <section className="mt-5">
            {playing ? (
              <div className="overflow-hidden rounded-2xl border border-hairline bg-surface backdrop-blur-xl">
                <div className="flex gap-3 p-3">
                  {playing.thumbnail_url && (
                    <Image
                      src={playing.thumbnail_url}
                      alt=""
                      width={128}
                      height={96}
                      className="h-[72px] w-24 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-accent-soft">
                      <span className="inline-block h-1.5 w-1.5 animate-breathe rounded-full bg-accent-soft" />
                      NOW PLAYING
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-snug">
                      {playing.track_name}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {playing.artist_name}
                    </p>
                  </div>
                </div>

                {playingDurationSeconds > 0 && (
                  <div className="px-3">
                    <div className="h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-alt transition-[width] duration-1000 ease-linear"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
                      <span>{formatDuration(elapsedSeconds) ?? "0:00"}</span>
                      <span>{formatDuration(playingDurationSeconds)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleSkipVote}
                  aria-pressed={playing.hasVotedSkip}
                  className={`mt-2 flex w-full items-center justify-center gap-2 border-t border-hairline py-3 text-xs font-medium transition-colors ${
                    playing.hasVotedSkip
                      ? "text-accent-soft"
                      : "text-ink-muted active:bg-white/5"
                  }`}
                >
                  <span aria-hidden>⏭</span>
                  {playing.hasVotedSkip ? "スキップに投票済み" : "スキップに投票"}
                  <span className="font-mono text-ink-faint">
                    {playing.skipVotes}/{SKIP_VOTE_THRESHOLD}
                  </span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-hairline bg-surface p-6 text-center backdrop-blur-xl">
                <p className="animate-breathe text-sm text-ink-muted">
                  まだ何も流れていません
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  最初の1曲をリクエストしてみてください
                </p>
              </div>
            )}
          </section>

          <div className="mt-7 flex items-baseline justify-between">
            <h2 className="text-sm font-bold">
              次に流れる曲
              {queue.length > 0 && (
                <span className="ml-2 font-mono text-xs font-normal text-ink-faint">
                  {queue.length}
                </span>
              )}
            </h2>
            {queueSeconds > 0 && (
              <span className="text-xs text-ink-faint">
                残り{formatRoughDuration(queueSeconds)}
              </span>
            )}
          </div>

          <ul className="mt-3 space-y-2">
            {queue.length === 0 && (
              <li className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center text-xs text-ink-faint">
                キューは空です。好きな曲を入れてください
              </li>
            )}
            {queue.map((item, index) => {
              const requester = pseudonymFor(item.requested_by);
              const isMine = item.requested_by === anonymousId;
              const duration = formatDuration(Math.round(item.duration_ms / 1000));
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-2.5 backdrop-blur-xl"
                >
                  <span className="w-4 shrink-0 text-center font-mono text-xs text-ink-faint">
                    {index + 1}
                  </span>
                  {item.thumbnail_url && (
                    <Image
                      src={item.thumbnail_url}
                      alt=""
                      width={80}
                      height={60}
                      className="h-11 w-[60px] shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.track_name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-faint">
                      <span aria-hidden>{requester.emoji}</span>
                      <span className="truncate">
                        {isMine ? "あなた" : requester.name}
                      </span>
                      {duration && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="font-mono">{duration}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVote(item)}
                    aria-pressed={item.hasVoted}
                    aria-label={`${item.track_name}に投票`}
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                      item.hasVoted
                        ? "border-transparent bg-gradient-to-b from-accent to-accent-alt text-white"
                        : "border-hairline bg-white/5 text-ink-muted active:bg-white/10"
                    }`}
                  >
                    <span aria-hidden className="text-[10px] leading-none">
                      ▲
                    </span>
                    <span
                      key={item.voteCount}
                      className="animate-pop mt-0.5 font-mono text-sm leading-none"
                    >
                      {item.voteCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {message && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-6">
          <p className="animate-fade-in rounded-full bg-stage-raised/95 px-4 py-2 text-center text-xs shadow-lg ring-1 ring-hairline">
            {message}
          </p>
        </div>
      )}

      {/* 親指が自然に届く位置に主要CTAを固定する */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-stage via-stage/95 to-transparent px-5 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            disabled={isSubmitting}
            className="w-full rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_-8px_rgba(168,85,247,.8)] active:scale-[.98] disabled:opacity-60"
          >
            {isSubmitting ? "追加しています..." : "曲をリクエストする"}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            参加コード <span className="font-mono tracking-widest">{joinCode}</span>
          </p>
        </div>
      </div>

      {isSearchOpen && (
        <SearchModal onClose={() => setIsSearchOpen(false)} onSelect={handleSelectTrack} />
      )}
    </>
  );
}
