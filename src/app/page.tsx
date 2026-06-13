import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
        TuneTable
      </h1>
      <p className="mt-4 max-w-md text-zinc-600">
        パーティーや集まりで流す音楽・動画を、参加者みんなの投票で決めるキューアプリ
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white"
        >
          ホストの方はこちら
        </Link>
      </div>
    </div>
  );
}
