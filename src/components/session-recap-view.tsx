import Image from "next/image";
import Link from "next/link";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { formatRoughDuration } from "@/lib/format";
import { pseudonymFor } from "@/lib/identity";
import type { SessionRecap } from "@/lib/recap";

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDateRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  if (!endedAt) return `${date} ${time}〜`;
  const end = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endedAt));
  return `${date} ${time}〜${end}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-3 py-3 text-center backdrop-blur-xl">
      <p className="font-mono text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}

export function SessionRecapView({
  recap,
  backHref,
}: {
  recap: SessionRecap;
  backHref?: string;
}) {
  const heroVideoId = recap.playedTracks[0]?.videoId ?? null;
  const playedTime = formatRoughDuration(recap.playedSeconds);

  return (
    <>
      <AmbientBackdrop videoId={heroVideoId} intensity="subtle" />

      <div className="flex flex-1 flex-col px-5 py-8">
        <div className="mx-auto w-full max-w-md">
          <header className="text-center">
            <p className="text-[11px] font-medium tracking-[0.2em] text-accent-soft">
              PARTY REWIND
            </p>
            <h1 className="mt-2 text-2xl font-bold text-balance [word-break:auto-phrase]">
              {recap.storeName}
            </h1>
            <p className="mt-1 text-xs text-ink-faint">
              {formatDateRange(recap.startedAt, recap.endedAt)}
            </p>
            {recap.isActive && (
              <p className="mt-3 inline-block rounded-full bg-accent/20 px-3 py-1 text-[11px] text-accent-soft">
                このパーティーは進行中です
              </p>
            )}
          </header>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="流れた曲" value={String(recap.totalPlayed)} />
            <Stat label="参加した人" value={String(recap.participantCount)} />
            <Stat label="入った票" value={String(recap.totalVotes)} />
          </div>
          {playedTime && (
            <p className="mt-2 text-center text-xs text-ink-faint">
              合計{playedTime}の音楽が流れました
            </p>
          )}

          {recap.playedTracks.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-sm font-bold">盛り上がった曲</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                集まった票の多い順
              </p>
              <ol className="mt-3 space-y-2">
                {recap.playedTracks.map((track, index) => {
                  const requester = pseudonymFor(track.requestedBy);
                  return (
                    <li
                      key={track.id}
                      className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-2.5 backdrop-blur-xl"
                    >
                      <span className="w-6 shrink-0 text-center text-sm">
                        {MEDALS[index] ?? (
                          <span className="font-mono text-xs text-ink-faint">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      {track.thumbnailUrl && (
                        <Image
                          src={track.thumbnailUrl}
                          alt=""
                          width={80}
                          height={60}
                          className="h-11 w-[60px] shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{track.trackName}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-faint">
                          <span aria-hidden>{requester.emoji}</span>
                          <span className="truncate">{requester.name}</span>
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm font-bold text-accent-soft">
                        {track.voteCount}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="mt-10 text-center text-sm text-ink-faint">
              この会ではまだ曲が流れませんでした
            </p>
          )}

          {recap.topRequesters.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-bold">曲を入れてくれた人</h2>
              <ul className="mt-3 space-y-2">
                {recap.topRequesters.map((requester) => {
                  const identity = pseudonymFor(requester.anonymousId);
                  return (
                    <li
                      key={requester.anonymousId}
                      className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-3 py-2.5 backdrop-blur-xl"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                        style={{ background: identity.color }}
                        aria-hidden
                      >
                        {identity.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {identity.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {requester.requestCount}曲
                        <span className="ml-2 font-mono text-ink-faint">
                          {requester.votesReceived}票
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <footer className="mt-10 text-center">
            {backHref ? (
              <Link
                href={backHref}
                className="text-xs text-ink-muted underline decoration-hairline"
              >
                ダッシュボードに戻る
              </Link>
            ) : (
              <p className="text-xs text-ink-faint">
                TuneTable — 流す曲を、その場のみんなで決める
              </p>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}
