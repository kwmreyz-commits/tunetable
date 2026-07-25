"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, formatRoughDuration } from "@/lib/format";
import { pseudonymFor } from "@/lib/identity";
import { SKIP_VOTE_THRESHOLD } from "@/lib/party-rules";
import { usePresenceCount } from "@/lib/use-presence";
import { AmbientBackdrop } from "@/components/ambient-backdrop";

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

interface QueueItem extends RequestRow {
  voteCount: number;
}

interface PlayingState extends RequestRow {
  startedAt: string | null;
  skipVotes: number;
}

export function SessionPlayer({
  sessionId,
  joinCode,
  joinUrl,
  storeName,
  initialVideoId,
  initialStartedAt,
}: {
  sessionId: string;
  joinCode: string;
  joinUrl: string;
  storeName: string;
  initialVideoId: string | null;
  initialStartedAt: string | null;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [playing, setPlaying] = useState<PlayingState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  // キューが尽きて待機中かどうか。曲が入ったら自動で再開するために持つ
  const [isIdle, setIsIdle] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const playerRef = useRef<YT.Player | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 曲送りは「前の曲をplayedにして次をplayingにする」複数更新なので、
  // ENDEDの二重発火やスキップ操作と重なると2曲同時にplayingになりうる。
  // ホスト画面は1タブしか開かない前提なので、ここで直列化すれば足りる。
  const isAdvancing = useRef(false);
  const latest = useRef({ queueLength: 0, playingId: null as string | null });

  const participantCount = usePresenceCount(sessionId, sessionId, false);

  const refresh = useCallback(async () => {
    const supabase = createClient();

    const { data: session } = await supabase
      .from("sessions")
      .select("now_playing_video_id, now_playing_started_at")
      .eq("id", sessionId)
      .maybeSingle();

    const { data: requests } = await supabase
      .from("requests")
      .select(
        "id, track_name, artist_name, video_id, thumbnail_url, status, created_at, duration_ms, requested_by",
      )
      .eq("session_id", sessionId)
      .in("status", ["queued", "playing"]);

    const rows = (requests ?? []) as RequestRow[];
    const ids = rows.map((row) => row.id);

    let votes: { request_id: string; created_at: string }[] = [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from("votes")
        .select("request_id, created_at")
        .in("request_id", ids);
      votes = data ?? [];
    }

    const counts = new Map<string, number>();
    for (const vote of votes) {
      counts.set(vote.request_id, (counts.get(vote.request_id) ?? 0) + 1);
    }

    const sortedQueue = rows
      .filter((row) => row.status === "queued")
      .map((row) => ({ ...row, voteCount: counts.get(row.id) ?? 0 }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.created_at.localeCompare(b.created_at);
      });
    setQueue(sortedQueue);

    const playingRows = rows.filter((row) => row.status === "playing");
    const current =
      playingRows.find((row) => row.video_id === session?.now_playing_video_id) ??
      playingRows[0] ??
      null;

    if (!current) {
      setPlaying(null);
      latest.current = { queueLength: sortedQueue.length, playingId: null };
      return;
    }

    const startedAt = session?.now_playing_started_at ?? null;
    const startedAtMs = startedAt ? Date.parse(startedAt) : 0;
    const skipVotes = votes.filter(
      (vote) =>
        vote.request_id === current.id && Date.parse(vote.created_at) > startedAtMs,
    ).length;

    setPlaying({ ...current, startedAt, skipVotes });
    latest.current = { queueLength: sortedQueue.length, playingId: current.id };
  }, [sessionId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refresh();
    }, 220);
  }, [refresh]);

  /**
   * キューの先頭(得票数が最も多い曲)へ進める。
   * 得票が同数のときはリクエストが早かった順。
   */
  const advance = useCallback(async () => {
    if (isAdvancing.current) return;
    isAdvancing.current = true;
    try {
      const supabase = createClient();

      const { data: requests } = await supabase
        .from("requests")
        .select("id, video_id, status, created_at")
        .eq("session_id", sessionId)
        .in("status", ["queued", "playing"]);

      const rows = requests ?? [];
      const playingRow = rows.find((row) => row.status === "playing");
      const queued = rows
        .filter((row) => row.status === "queued")
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      if (queued.length === 0) {
        // 流す曲が尽きた。再生し終えた曲をplayingのまま残すと参加者側にも
        // 「まだ流れている」ように見えるので、ここで畳んで待機状態にする。
        // 次に誰かが曲を入れたら isIdle を見て自動で再開する。
        if (playingRow) {
          await supabase.from("requests").update({ status: "played" }).eq("id", playingRow.id);
          await supabase
            .from("sessions")
            .update({ now_playing_video_id: null, now_playing_started_at: null })
            .eq("id", sessionId);
        }
        setIsIdle(true);
        await refresh();
        return;
      }

      setIsIdle(false);

      const queuedIds = queued.map((row) => row.id);
      const { data: votes } = await supabase
        .from("votes")
        .select("request_id")
        .in("request_id", queuedIds);

      const counts = new Map<string, number>();
      for (const vote of votes ?? []) {
        counts.set(vote.request_id, (counts.get(vote.request_id) ?? 0) + 1);
      }

      // created_at昇順で並べた配列に対する安定ソートなので、
      // 同票のときはリクエストが早い曲が先に残る
      const next = [...queued].sort(
        (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0),
      )[0];

      if (playingRow) {
        await supabase.from("requests").update({ status: "played" }).eq("id", playingRow.id);
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
      await refresh();
    } finally {
      isAdvancing.current = false;
    }
  }, [sessionId, refresh]);

  /** 再生できない動画に当たったらキューから外して次へ進む */
  const skipUnplayable = useCallback(async () => {
    const playingId = latest.current.playingId;
    if (playingId) {
      const supabase = createClient();
      await supabase.from("requests").update({ status: "removed" }).eq("id", playingId);
    }
    await advance();
  }, [advance]);

  useEffect(() => {
    function createPlayer() {
      playerRef.current = new window.YT.Player("youtube-player", {
        // videoIdキーを省略することで、YouTube側のデフォルト値(空文字)を維持する。
        // ここで videoId: undefined を渡すと Object.assign でデフォルトの ""
        // が undefined に上書きされ、widget側のID検証で "Invalid video id" が
        // throwされる。
        ...(initialVideoId ? { videoId: initialVideoId } : {}),
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              advance();
            }
          },
          onError: () => {
            skipUnplayable();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- プレーヤーはマウント時に1度だけ作る
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回取得とRealtime購読
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`session-player-${sessionId}`)
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
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [sessionId, refresh, scheduleRefresh]);

  // 参加者のスキップ投票が閾値に達したら自動で次へ。
  // 次の曲が無いときに飛ばすと無音になるだけなので、キューがある場合だけ。
  useEffect(() => {
    if (!isStarted || !playing) return;
    if (playing.skipVotes < SKIP_VOTE_THRESHOLD) return;
    if (queue.length === 0) return;
    advance();
  }, [isStarted, playing, queue.length, advance]);

  // キューが尽きて止まったあとに誰かが曲を入れたら、ホストの操作なしで再開する。
  // ここが無いと「無音のまま誰も気づかない」状態が続いてしまう。
  useEffect(() => {
    if (!isStarted || !isIdle) return;
    if (queue.length === 0) return;
    advance();
  }, [isStarted, isIdle, queue.length, advance]);

  useEffect(() => {
    if (!playing?.startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [playing?.startedAt]);

  async function removeFromQueue(requestId: string) {
    const supabase = createClient();
    await supabase.from("requests").update({ status: "removed" }).eq("id", requestId);
    await refresh();
  }

  /**
   * 「再生開始」。ページを再読み込みしても続きから流せるように、
   * 再生中の曲があれば経過時間ぶんシークしてから再生する。
   * v2では毎回頭出しになっていたため、誤ってリロードすると場が止まった。
   */
  function handleStart() {
    setIsStarted(true);

    const startedAt = initialStartedAt ?? playing?.startedAt ?? null;
    const durationSeconds = playing ? Math.round(playing.duration_ms / 1000) : 0;

    if (initialVideoId && startedAt) {
      const elapsed = Math.floor((Date.now() - Date.parse(startedAt)) / 1000);
      if (durationSeconds > 0 && elapsed >= durationSeconds - 2) {
        advance();
        return;
      }
      if (elapsed > 3) {
        playerRef.current?.seekTo(elapsed, true);
      }
      playerRef.current?.playVideo();
      return;
    }

    if (initialVideoId) {
      playerRef.current?.playVideo();
      return;
    }

    advance();
  }

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

  return (
    <>
      <AmbientBackdrop videoId={playing?.video_id ?? initialVideoId} />

      <div className="flex flex-1 flex-col px-5 py-5 lg:px-8">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-strong"
            >
              ← 戻る
            </Link>
            <h1 className="truncate text-sm font-medium text-ink-muted">{storeName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {participantCount > 0 && (
              <span className="rounded-full bg-surface px-3 py-1.5 text-xs text-ink-muted">
                <span className="font-mono font-bold text-ink">{participantCount}</span>
                人が参加中
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsQrExpanded(true)}
              className="rounded-full bg-surface px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-strong"
            >
              QRを大きく表示
            </button>
          </div>
        </header>

        <div className="mx-auto mt-4 grid w-full max-w-7xl flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-2xl ring-1 ring-hairline">
              <div id="youtube-player" className="aspect-video w-full bg-black" />
            </div>

            {!isStarted ? (
              <button
                type="button"
                onClick={handleStart}
                disabled={!isReady}
                className="w-full rounded-2xl bg-gradient-to-r from-accent to-accent-alt px-6 py-5 text-lg font-bold text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,.9)] transition-transform active:scale-[.99] disabled:opacity-50"
              >
                {isReady ? "再生を開始する" : "プレーヤーを準備中..."}
              </button>
            ) : playing ? (
              <div className="rounded-2xl border border-hairline bg-surface p-4 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-accent-soft">
                      <span className="inline-block h-1.5 w-1.5 animate-breathe rounded-full bg-accent-soft" />
                      NOW PLAYING
                    </p>
                    {/* テレビ表示を想定して、離れても読めるサイズにする */}
                    <p className="mt-1.5 truncate text-2xl font-bold tracking-tight">
                      {playing.track_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 truncate text-sm text-ink-muted">
                      <span className="truncate">{playing.artist_name}</span>
                      <span aria-hidden className="text-ink-faint">
                        ·
                      </span>
                      <span className="shrink-0 text-ink-faint">
                        {pseudonymFor(playing.requested_by).emoji}{" "}
                        {pseudonymFor(playing.requested_by).name}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={advance}
                    disabled={queue.length === 0}
                    className="shrink-0 rounded-full border border-hairline px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-strong disabled:opacity-40"
                  >
                    次の曲へ ⏭
                  </button>
                </div>

                {playingDurationSeconds > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-alt transition-[width] duration-1000 ease-linear"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-faint">
                      <span>{formatDuration(elapsedSeconds) ?? "0:00"}</span>
                      <span>{formatDuration(playingDurationSeconds)}</span>
                    </div>
                  </div>
                )}

                {playing.skipVotes > 0 && (
                  <p className="mt-2 text-xs text-ink-faint">
                    スキップ投票{" "}
                    <span className="font-mono text-ink-muted">
                      {playing.skipVotes}/{SKIP_VOTE_THRESHOLD}
                    </span>
                    {queue.length === 0 && "(次の曲がないため自動スキップしません)"}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-hairline bg-surface p-6 text-center backdrop-blur-xl">
                <p className="animate-breathe text-sm text-ink-muted">
                  リクエストを待っています
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  QRコードを読み取ってもらうと、ここに曲が並びます
                </p>
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-2xl border border-hairline bg-surface p-5 text-center backdrop-blur-xl">
              <p className="text-[11px] font-medium tracking-widest text-ink-faint">
                スマホで参加
              </p>
              <div className="mt-3 flex justify-center">
                <div className="rounded-xl bg-white p-3">
                  <QRCodeSVG value={joinUrl} size={148} />
                </div>
              </div>
              {/* 部屋の向こうから読める大きさ。QRが読めない人向けの逃げ道 */}
              <p className="mt-3 font-mono text-3xl font-bold tracking-[0.15em]">
                {joinCode}
              </p>
              <p className="mt-1 break-all text-[11px] text-ink-faint">{joinUrl}</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-hairline bg-surface p-4 backdrop-blur-xl">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold">
                  キュー
                  {queue.length > 0 && (
                    <span className="ml-2 font-mono text-xs font-normal text-ink-faint">
                      {queue.length}
                    </span>
                  )}
                </h2>
                {queueSeconds > 0 && (
                  <span className="text-[11px] text-ink-faint">
                    残り{formatRoughDuration(queueSeconds)}
                  </span>
                )}
              </div>

              <ul className="mt-3 space-y-2 overflow-y-auto">
                {queue.length === 0 && (
                  <li className="rounded-xl border border-dashed border-hairline px-3 py-6 text-center text-xs text-ink-faint">
                    キューは空です
                  </li>
                )}
                {queue.map((item, index) => {
                  const requester = pseudonymFor(item.requested_by);
                  return (
                    <li
                      key={item.id}
                      className="group flex items-center gap-2.5 rounded-xl bg-white/5 p-2"
                    >
                      <span className="w-4 shrink-0 text-center font-mono text-xs text-ink-faint">
                        {index + 1}
                      </span>
                      {item.thumbnail_url && (
                        <Image
                          src={item.thumbnail_url}
                          alt=""
                          width={72}
                          height={54}
                          className="h-9 w-12 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{item.track_name}</p>
                        <p className="truncate text-[10px] text-ink-faint">
                          {requester.emoji} {requester.name}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-accent-soft">
                        {item.voteCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        aria-label={`${item.track_name}をキューから削除`}
                        className="shrink-0 rounded-full px-2 py-1 text-xs text-ink-faint opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {isQrExpanded && (
        <button
          type="button"
          onClick={() => setIsQrExpanded(false)}
          className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-stage/98 p-8"
          aria-label="QRコードの拡大表示を閉じる"
        >
          <p className="text-base text-ink-muted">スマホのカメラで読み取ってください</p>
          <div className="rounded-3xl bg-white p-6">
            <QRCodeSVG value={joinUrl} size={340} />
          </div>
          <p className="font-mono text-6xl font-bold tracking-[0.15em]">{joinCode}</p>
          <p className="text-sm text-ink-faint">{joinUrl}</p>
          <p className="mt-4 text-xs text-ink-faint">画面をクリックすると閉じます</p>
        </button>
      )}
    </>
  );
}
