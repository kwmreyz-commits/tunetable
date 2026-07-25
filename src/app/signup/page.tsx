import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { signup } from "./actions";

export const metadata: Metadata = {
  title: "ホスト登録",
};

const FIELD_CLASS =
  "mt-1.5 block w-full rounded-xl border border-hairline bg-white/5 px-4 py-3 text-sm text-ink focus:border-accent-soft focus:outline-none";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
            <h1 className="mt-3 text-2xl font-bold">ホスト登録</h1>
            <p className="mt-2 text-xs text-ink-faint">
              パーティーを主催する人だけ登録が必要です
            </p>
          </div>

          {error && (
            <p className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <form action={signup} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="storeName"
                className="block text-xs font-medium text-ink-muted"
              >
                表示名
              </label>
              <p className="mt-1 text-[11px] text-ink-faint">
                参加者の画面に出ます(例: 田中家パーティー)
              </p>
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                maxLength={40}
                className={FIELD_CLASS}
              />
            </div>
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
                minLength={8}
                autoComplete="new-password"
                className={FIELD_CLASS}
              />
              <p className="mt-1.5 text-[11px] text-ink-faint">
                8文字以上で入力してください
              </p>
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-accent to-accent-alt px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_-8px_rgba(168,85,247,.8)]"
            >
              登録する
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-ink-muted">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="font-medium text-accent-soft underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
