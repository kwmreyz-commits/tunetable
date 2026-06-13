import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
          店舗アカウント登録
        </h1>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={signup} className="mt-8 space-y-4">
          <div>
            <label htmlFor="storeName" className="block text-sm font-medium text-zinc-700">
              店舗名
            </label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">8文字以上で入力してください</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
          >
            登録する
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
