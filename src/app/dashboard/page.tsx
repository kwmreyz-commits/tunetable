import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { startSession, endSession, updateHostSettings } from "./session-actions";

export const metadata: Metadata = {
  title: "ダッシュボード",
};

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_user_id", userData.user!.id)
    .single();

  // active な行が複数残っていても画面が固まらないよう、最新の1件を採用する
  const { data: activeSessions } = await supabase
    .from("sessions")
    .select("id, join_code, started_at")
    .eq("store_id", store!.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1);
  const activeSession = activeSessions?.[0] ?? null;

  const { data: pastSessions } = await supabase
    .from("sessions")
    .select("id, join_code, started_at, ended_at")
    .eq("store_id", store!.id)
    .eq("status", "ended")
    .order("started_at", { ascending: false })
    .limit(8);

  return (
    <>
      <AmbientBackdrop videoId={null} />

      <div className="flex flex-1 flex-col px-5 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-[0.2em] text-ink-faint">
                TUNETABLE
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold">{store?.name ?? "ホスト"}</h1>
              <p className="mt-1 truncate text-xs text-ink-faint">
                {userData.user?.email}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="shrink-0 rounded-full border border-hairline px-4 py-2 text-xs text-ink-muted transition-colors hover:bg-surface"
              >
                ログアウト
              </button>
            </form>
          </header>

          {saved && (
            <p className="mt-6 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-ink-muted">
              設定を保存しました
            </p>
          )}

          <section className="mt-8">
            {activeSession ? (
              <div className="rounded-2xl border border-hairline bg-surface p-6 backdrop-blur-xl">
                <p className="flex items-center gap-2 text-xs font-medium text-accent-soft">
                  <span className="inline-block h-1.5 w-1.5 animate-breathe rounded-full bg-accent-soft" />
                  パーティー開催中
                </p>
                <p className="mt-4 font-mono text-5xl font-bold tracking-[0.15em]">
                  {activeSession.join_code}
                </p>
                <p className="mt-2 text-xs text-ink-faint">
                  {formatSessionDate(activeSession.started_at)} から開催中
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/session"
                    className="rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-3 text-sm font-bold text-white shadow-[0_8px_28px_-8px_rgba(168,85,247,.8)]"
                  >
                    再生ページを開く
                  </Link>
                  <form action={endSession.bind(null, activeSession.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-hairline px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-strong"
                    >
                      パーティーを終了
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-hairline bg-surface p-6 text-center backdrop-blur-xl">
                <p className="text-3xl" aria-hidden>
                  🎉
                </p>
                <h2 className="mt-3 text-lg font-bold">パーティーを始めましょう</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
                  開始すると参加用のQRコードが発行されます。
                  再生ページをテレビにつなぐと、参加者がスマホから曲を入れられます。
                </p>
                <form action={startSession} className="mt-6">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-4 text-base font-bold text-white shadow-[0_8px_32px_-8px_rgba(168,85,247,.8)] sm:w-auto sm:px-10"
                  >
                    パーティーを開始
                  </button>
                </form>
              </div>
            )}
          </section>

          {pastSessions && pastSessions.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-bold">これまでのパーティー</h2>
              <p className="mt-1 text-[11px] text-ink-faint">
                流れた曲と盛り上がった順が振り返れます
              </p>
              <ul className="mt-3 space-y-2">
                {pastSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/s/${session.join_code}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 backdrop-blur-xl transition-colors hover:bg-surface-strong"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">
                          {formatSessionDate(session.started_at)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-ink-faint">
                          {session.join_code}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">記録を見る →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8">
            <details className="group rounded-2xl border border-hairline bg-surface backdrop-blur-xl">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold">
                <span className="flex items-center justify-between">
                  ホストの設定
                  <span className="text-xs font-normal text-ink-faint transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>

              <form action={updateHostSettings} className="space-y-5 px-5 pb-5">
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-ink-muted">
                    表示名
                  </label>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    参加者の画面と振り返りページに出ます
                  </p>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={store?.name ?? ""}
                    className="mt-2 w-full rounded-xl border border-hairline bg-white/5 px-4 py-2.5 text-sm focus:border-accent-soft focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ngWords"
                    className="block text-xs font-medium text-ink-muted"
                  >
                    リクエストを禁止することば
                  </label>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    改行かカンマで区切ります。動画のタイトルかチャンネル名に
                    含まれていたらリクエストを受け付けません。
                  </p>
                  <textarea
                    id="ngWords"
                    name="ngWords"
                    rows={3}
                    defaultValue={(store?.ng_words ?? []).join("\n")}
                    placeholder={"例:\n下ネタ\nドッキリ"}
                    className="mt-2 w-full rounded-xl border border-hairline bg-white/5 px-4 py-2.5 text-sm focus:border-accent-soft focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-surface-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/15"
                >
                  設定を保存
                </button>
              </form>
            </details>
          </section>
        </div>
      </div>
    </>
  );
}
