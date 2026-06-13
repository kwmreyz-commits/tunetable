"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
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

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "検索に失敗しました");
        setResults([]);
        return;
      }
      setResults(data.results as TrackResult[]);
    } catch {
      setError("検索に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white p-4 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">動画をリクエスト</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-zinc-500"
          >
            閉じる
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="曲名・アーティスト名で検索"
            className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            検索
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {isLoading && <p className="mt-3 text-sm text-zinc-500">検索中...</p>}

        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {results.map((track) => (
            <li key={track.videoId}>
              <button
                type="button"
                onClick={() => onSelect(track)}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left hover:bg-zinc-50"
              >
                {track.thumbnailUrl && (
                  <Image
                    src={track.thumbnailUrl}
                    alt={track.title}
                    width={64}
                    height={48}
                    className="h-12 w-16 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {track.channelTitle}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
