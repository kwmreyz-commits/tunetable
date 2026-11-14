import { CostBar } from "./components/CostBar";
import { clinic } from "./data/clinic";
import { estimateNote, stages } from "./data/journey";
import { modelCases } from "./data/modelCases";
import type { Stage } from "./data/types";
import { costText, yen } from "./lib/format";
import { hasSample, isPublicBuild, visibleModelCases } from "./lib/publicCheck";

const scaleMax = Math.max(
  ...stages.map((s) =>
    s.cost.kind === "amount" ? (s.cost.max ?? s.cost.min) : 0,
  ),
);
const shownCases = visibleModelCases(modelCases, isPublicBuild());
const showSampleBanner = hasSample(stages, shownCases);
const telHref = `tel:${clinic.tel.replace(/-/g, "")}`;
const TBD = "（準備中）";

function StepBadge({ no }: { no: number }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-main text-[1.05rem] font-bold text-white">
      {no}
    </span>
  );
}

function EstimateNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-xl border-2 border-main bg-main-soft px-4 py-3 text-center font-bold text-main-dark ${className}`}
    >
      {estimateNote}
    </p>
  );
}

// スマホ用：4段階と費用を短くまとめた早見
function Overview() {
  return (
    <ol className="lg:hidden" aria-label="道のりの早見">
      {stages.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex min-h-12 items-center gap-3 border-b border-line py-2 no-underline"
          >
            <StepBadge no={s.no} />
            <span className="flex-1 leading-snug">
              <span className="block font-bold">{s.name}</span>
              <span className="block text-[1rem] text-sub">
                {s.cost.kind === "amount"
                  ? `${costText(s.cost)}（税込）`
                  : costText(s.cost)}
              </span>
            </span>
          </a>
          {s.no === 2 && <EstimateNote className="my-3 text-[1rem]" />}
        </li>
      ))}
    </ol>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  const { cost } = stage;
  return (
    <section
      id={stage.id}
      aria-labelledby={`${stage.id}-h`}
      className="card relative flex scroll-mt-4 flex-col rounded-2xl border border-line bg-card p-4"
    >
      <div className="flex items-center gap-3">
        <StepBadge no={stage.no} />
        <h3 id={`${stage.id}-h`} className="text-[1.15rem] font-bold leading-snug">
          {stage.name}
        </h3>
      </div>
      <p className="mt-2 leading-normal">{stage.what}</p>

      <dl className="mt-3 space-y-1 border-t border-line pt-3 pb-3 leading-normal">
        <div>
          <dt className="inline font-bold">通院：</dt>
          <dd className="inline">{stage.visits}</dd>
        </div>
        {stage.time && (
          <div>
            <dt className="inline font-bold">1回の時間：</dt>
            <dd className="inline">{stage.time}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto rounded-xl bg-paper p-3">
        <p className="text-[1rem] font-bold text-sub">
          費用の目安{cost.kind === "amount" && `（${cost.label}・税込）`}
        </p>
        {cost.kind === "amount" ? (
          <>
            <p className="text-[1.45rem] font-bold leading-tight text-main-dark">
              {costText(cost)}
            </p>
            <CostBar cost={cost} scaleMax={scaleMax} />
          </>
        ) : (
          <p className="font-bold text-main-dark">{cost.text}</p>
        )}
      </div>
    </section>
  );
}

// 各段階の注意点（カードを短く保つため、道のりの下にまとめる）
function Cautions() {
  return (
    <section aria-labelledby="cautions-h" className="mt-12">
      <h2 id="cautions-h" className="text-[1.35rem] font-bold">
        それぞれの段階でのご注意
      </h2>
      <ul className="mt-4 space-y-3">
        {stages.map((s) => (
          <li key={s.id} className="card flex gap-3 rounded-2xl border border-line bg-card p-4">
            <StepBadge no={s.no} />
            <p>
              <span className="font-bold">{s.name}：</span>
              {s.risks}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Arrow() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center text-[1.6rem] leading-none text-main"
    >
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  );
}

function Journey() {
  return (
    <div className="mt-6 lg:mt-0">
      <h2 className="mb-3 text-[1.2rem] font-bold lg:sr-only">
        各段階のくわしい内容
      </h2>
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {stages.map((s, i) => (
          <FragmentWithArrow key={s.id} last={i === stages.length - 1}>
            <StageCard stage={s} />
          </FragmentWithArrow>
        ))}
      </div>
      <div className="mt-2 hidden lg:block">
        <p aria-hidden="true" className="text-center leading-none text-main">
          ▲
        </p>
        <EstimateNote className="mx-auto max-w-3xl text-[1.1rem]" />
      </div>
    </div>
  );
}

function FragmentWithArrow({
  children,
  last,
}: {
  children: React.ReactNode;
  last: boolean;
}) {
  return (
    <>
      {children}
      {!last && <Arrow />}
    </>
  );
}

function ModelCases() {
  if (shownCases.length === 0) return null;
  return (
    <section aria-labelledby="cases-h" className="mt-12">
      <h2 id="cases-h" className="text-[1.35rem] font-bold">
        費用の例（モデルケース）
      </h2>
      <p className="mt-1 text-sub">
        あくまで一例です。実際の内容と費用は、デンタルドックのあとにお一人ずつご相談します。
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {shownCases.map((c) => (
          <article key={c.id} className="card rounded-2xl border border-line bg-card p-5">
            {!c.confirmed && (
              <p className="mb-2 inline-block rounded border border-warn bg-warn-soft px-2 text-[1rem] font-bold text-warn">
                サンプル（未確認）
              </p>
            )}
            <h3 className="font-bold leading-snug">{c.title}</h3>
            <p className="mt-2">{c.summary}</p>
            <p className="mt-3 text-[1rem] font-bold text-sub">合計（税込）</p>
            <p className="text-[1.45rem] font-bold leading-tight text-main-dark">
              {yen(c.total)}
            </p>
            <p className="mt-1 text-[1rem]">
              期間 {c.months}／通院 {c.visits}
            </p>
            <p className="mt-3 text-[1rem] text-sub">
              <span className="font-bold">ご注意：</span>
              {c.risks}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const btn =
    "flex min-h-14 flex-1 items-center justify-center rounded-xl px-5 py-3 text-center text-[1.1rem] font-bold no-underline";
  return (
    <section aria-labelledby="contact-h" className="mt-12">
      <h2 id="contact-h" className="text-[1.35rem] font-bold">
        ご予約・お問い合わせ
      </h2>
      <p className="mt-1 text-sub">完全予約制です。お電話またはLINEでご予約ください。</p>
      <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row">
        <a href={telHref} className={`${btn} bg-main text-white`}>
          電話で予約する（{clinic.tel}）
        </a>
        {clinic.lineUrl ? (
          <a
            href={clinic.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btn} border-2 border-main bg-card text-main-dark`}
          >
            LINEで予約する
          </a>
        ) : (
          <span className={`${btn} border-2 border-dashed border-line bg-card text-sub`}>
            LINEで予約する{TBD}
          </span>
        )}
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-2xl border border-line bg-card p-5 sm:grid-cols-[auto_1fr]">
        <dt className="font-bold">電話</dt>
        <dd>{clinic.tel}</dd>
        <dt className="font-bold">診療時間</dt>
        <dd>
          {clinic.hours.length > 0
            ? clinic.hours.map((h) => <div key={h}>{h}</div>)
            : TBD}
        </dd>
        <dt className="font-bold">休診日</dt>
        <dd>{clinic.closed || TBD}</dd>
        <dt className="font-bold">住所</dt>
        <dd>{clinic.address || TBD}</dd>
      </dl>
    </section>
  );
}

export default function App() {
  return (
    <>
      {showSampleBanner && (
        <p
          role="status"
          className="border-b-2 border-warn bg-warn-soft px-4 py-2 text-center font-bold text-warn"
        >
          サンプル金額です（院長の確認前の金額が含まれています）
        </p>
      )}
      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 lg:px-5">
        <header>
          <p className="text-[1rem] text-sub">{clinic.name}</p>
          <h1 className="text-[1.5rem] font-bold leading-snug lg:text-[1.8rem]">
            治療と費用の道のり
          </h1>
          <p className="mt-1 lg:mb-4">
            当院は完全予約制の自由診療（保険のきかない診療）です。金額はすべて税込です。
          </p>
        </header>

        <Overview />
        <Journey />
        <Cautions />
        <ModelCases />
        <Contact />

        <footer className="mt-10 border-t border-line pt-4 text-[1rem] text-sub">
          <p>
            このページの金額は目安です。お口の状態によって、内容と費用は変わります。
          </p>
          <p className="mt-1">
            {clinic.name}　電話 {clinic.tel}
          </p>
        </footer>
      </main>
    </>
  );
}
