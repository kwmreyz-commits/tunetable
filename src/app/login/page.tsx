import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "ホストログイン",
};

const FIELD_CLASS =
  "mt-1.5 block w-full rounded-xl border border-hairline bg-white/5 px-4 py-3 text-sm text-ink focus:border-accent-soft focus:outline-none";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <>
      <AmbientBackdrop videoId={null} />

      <div className="flex flex-1 flex-col justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center">
            <Link
              href="/"
              className="text-[11px] font-medium tracking-[0.25em] text-ink-faint"
            >
              TUNETABLE
            </Link>
            <h1 className="mt-3 text-2xl font-bold">ホストログイン</h1>
            <p className="mt-2 text-xs text-ink-faint">
              参加するだけの方はログインは不要です
            </p>
          </div>

          {message && (
            <p className="mt-6 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-ink-muted">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={login} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-muted">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-ink-muted"
              >
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={FIELD_CLASS}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_-8px_rgba(168,85,247,.8)]"
            >
              ログイン
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-muted">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="font-medium text-accent-soft underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
