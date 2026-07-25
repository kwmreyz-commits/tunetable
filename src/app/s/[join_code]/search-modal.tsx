"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { formatDuration } from "@/lib/format";
import type { TrackResult } from "@/lib/music-provider/types";

export function SearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (track: TrackResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const lastQuery = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 背後のリストがスクロールしてしまうのを止める
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /**
   * 入力中のインクリメンタル検索はあえて実装しない。
   * YouTube Data APIのsearch.listは1回100ユニット=1日100回しか叩けないので、
   * 「あ」「あい」「あいみ」で3回消費すると1晩でクォータが尽きる。
   * 送信は明示操作(Enter / 検索ボタン)に限定する。
   */
  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (trimmed === lastQuery.current && results.length > 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = (await response.json()) as {
        results?: TrackResult[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "検索に失敗しました");
        setResults([]);
        return;
      }
      lastQuery.current = trimmed;
      setResults(data.results ?? []);
    } catch {
      setError("通信に失敗しました。電波の良い場所でお試しください");
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="動画をリクエスト"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-hairline bg-stage-raised sm:rounded-3xl sm:border"
        onClick={(event) => event.stopPropagation()}
      >
        {/* スワイプで閉じられそうに見せるためのつまみ */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-4 pt-3">
          <h2 className="text-base font-bold">曲をリクエスト</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full px-3 py-1.5 text-sm text-ink-muted active:bg-white/5"
          >
            閉じる
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-3 flex gap-2 px-4">
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="曲名・アーティスト名"
            aria-label="曲名・アーティスト名"
            className="min-w-0 flex-1 rounded-full border border-hairline bg-white/5 px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-accent-soft focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || query.trim().length === 0}
            className="shrink-0 rounded-full bg-gradient-to-r from-accent to-accent-alt px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            検索
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}

          {isLoading && (
            <ul className="space-y-2" aria-label="検索中">
              {[0, 1, 2, 3].map((index) => (
                <li
                  key={index}
                  className="flex animate-breathe items-center gap-3 rounded-xl border border-hairline p-2"
                >
                  <span className="h-12 w-16 shrink-0 rounded-md bg-white/10" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-3/4 rounded bg-white/10" />
                    <span className="block h-2.5 w-1/3 rounded bg-white/10" />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && !error && results.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-faint">
              {hasSearched
                ? "見つかりませんでした。別のことばで探してみてください"
                : "聴きたい曲を検索してください"}
            </p>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="space-y-2">
              {results.map((track) => {
                const duration = formatDuration(track.durationSeconds);
                return (
                  <li key={track.videoId}>
                    <button
                      type="button"
                      onClick={() => onSelect(track)}
                      className="flex w-full items-center gap-3 rounded-xl border border-hairline p-2 text-left active:bg-white/5"
                    >
                      {track.thumbnailUrl && (
                        <Image
                          src={track.thumbnailUrl}
                          alt=""
                          width={96}
                          height={72}
                          className="h-12 w-16 shrink-0 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">
                          {track.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                          {track.channelTitle}
                          {duration && (
                            <>
                              <span aria-hidden> · </span>
                              <span className="font-mono">{duration}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <span
                        aria-hidden
                        className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-ink-muted"
                      >
                        +
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
