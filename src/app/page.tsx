import Link from "next/link";
import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { JoinForm } from "./join-form";

const STEPS = [
  {
    emoji: "📺",
    title: "ホストが再生ページを開く",
    body: "ノートPCをテレビにつないで開いておくだけ。専用の機材はいりません",
  },
  {
    emoji: "📱",
    title: "参加者はQRを読むだけ",
    body: "アプリのインストールもアカウント登録も不要です",
  },
  {
    emoji: "🗳",
    title: "票が多い曲から流れる",
    body: "次に何が流れるかは、その場のみんなが決めます",
  },
];

export default function Home() {
  return (
    <>
      <AmbientBackdrop videoId={null} />

      <div className="flex flex-1 flex-col px-6 py-14">
        <div className="mx-auto w-full max-w-md">
          <header className="text-center">
            <p className="text-[11px] font-medium tracking-[0.25em] text-accent-soft">
              TUNETABLE
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-balance [word-break:auto-phrase]">
              流す曲を、
              <br />
              その場のみんなで決める
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              ホームパーティーや二次会で、参加者がスマホから曲をリクエスト。
              投票の多い順に、ホストの画面で自動再生されます。
            </p>
          </header>

          <div className="mt-10 rounded-2xl border border-hairline bg-surface p-5 backdrop-blur-xl">
            <JoinForm />
          </div>

          <ul className="mt-10 space-y-3">
            {STEPS.map((step) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-2xl border border-hairline bg-surface p-4 backdrop-blur-xl"
              >
                <span className="text-xl" aria-hidden>
                  {step.emoji}
                </span>
                <div>
                  <p className="text-sm font-bold">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-block rounded-full border border-hairline px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
            >
              ホストとしてはじめる
            </Link>
            <p className="mt-3 text-[11px] text-ink-faint">
              パーティーを主催する人だけ登録が必要です
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
