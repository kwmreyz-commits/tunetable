import { useState } from "react";
import { CostBar } from "../components/CostBar";
import { Icon } from "../components/Icon";
import { SampleBanner } from "../components/SampleBanner";
import { clinic } from "../data/clinic";
import { dock } from "../data/dock";
import { estimateNote, stages } from "../data/journey";
import { modelCases } from "../data/modelCases";
import type { Stage } from "../data/types";
import { costText, yen } from "../lib/format";
import { hasSample, isPublicBuild, visibleModelCases } from "../lib/publicCheck";

const scaleMax = Math.max(
  ...stages.map((s) => (s.cost.kind === "amount" ? (s.cost.max ?? s.cost.min) : 0)),
);
const shownCases = visibleModelCases(modelCases, isPublicBuild());
const showSampleBanner = hasSample(stages, shownCases, dock.confirmed);
const telHref = `tel:${clinic.tel.replace(/-/g, "")}`;
const TBD = "（準備中）";
const dockStage = stages.find((s) => s.id === "dental-dock")!;
const h2 = "text-[1.45rem] font-bold leading-snug";
const card = "card rounded-2xl border border-line bg-card";

function StepBadge({ no }: { no: number }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-main text-[1.1rem] font-bold text-white">
      {no}
    </span>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center text-[1.5rem] leading-none text-main print:hidden ${className}`}
    >
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </div>
  );
}

// 道のりの1段階。ふだんは短く、押すとくわしい説明が開く（印刷では常に開く）
function StageCard({ stage }: { stage: Stage }) {
  const [open, setOpen] = useState(false);
  const isDock = stage.id === "dental-dock";
  return (
    <section
      id={stage.id}
      aria-labelledby={`${stage.id}-h`}
      className={`${card} flex scroll-mt-4 flex-col p-4 print:p-2 ${isDock ? "border-2 !border-main" : ""}`}
    >
      <div className="flex items-center gap-3">
        <StepBadge no={stage.no} />
        <h3 id={`${stage.id}-h`} className="flex-1 text-[1.15rem] font-bold leading-snug">
          {stage.name}
        </h3>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${stage.name}を${open ? "とじる" : "くわしく見る"}`}
          onClick={() => setOpen(!open)}
          className="no-print min-h-12 shrink-0 rounded-xl border-2 border-line bg-card px-3 lg:hidden"
        >
          {open ? "とじる" : "くわしく"}
        </button>
      </div>
      <p className="mt-2 text-[1.35rem] font-bold leading-tight text-main-dark">
        {costText(stage.cost)}
        {stage.cost.kind === "amount" && <span className="text-[1rem] font-normal text-sub">（税込）</span>}
      </p>
      <p className="mt-1 text-sub">通院：{stage.visits}</p>

      <div className={`mt-2 space-y-2 border-t border-line pt-2 leading-normal ${open ? "" : "hidden print:block"}`}>
        <p>{stage.what}</p>
        {stage.time && <p>1回の時間：{stage.time}</p>}
        <p className="text-sub">
          <span className="font-bold">ご注意：</span>
          {stage.risks}
        </p>
      </div>
      <div className="no-print mt-auto flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="hidden min-h-12 flex-1 rounded-xl border-2 border-line bg-card px-3 lg:block"
        >
          {open ? "とじる" : "くわしく"}
        </button>
        {isDock && (
          <a
            href="#dock"
            className="inline-flex min-h-12 flex-1 basis-full items-center justify-center rounded-xl bg-main px-3 font-bold text-white no-underline"
          >
            どんな検査？ ↓
          </a>
        )}
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section aria-labelledby="journey-h">
      <h2 id="journey-h" className="sr-only">
        4つの段階
      </h2>
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch print:grid print:grid-cols-4 print:gap-2">
        {stages.map((s, i) => (
          <div key={s.id} className="contents">
            <StageCard stage={s} />
            {i < stages.length - 1 &&
              (s.no === 2 ? (
                // スマホでは、ドックと治療の間に約束ごとを入れる
                <>
                  <p className="rounded-xl border-2 border-main bg-main-soft px-3 py-2 text-center font-bold leading-snug text-main-dark lg:hidden print:hidden">
                    {estimateNote}
                  </p>
                  <Arrow className="hidden lg:flex" />
                </>
              ) : (
                <Arrow className="hidden lg:flex" />
              ))}
          </div>
        ))}
      </div>
      <p className="mx-auto mt-3 hidden max-w-3xl rounded-xl border-2 border-main bg-main-soft px-4 py-3 text-center text-[1.1rem] font-bold text-main-dark lg:block print:block">
        {estimateNote}
      </p>
    </section>
  );
}

function Dock() {
  const hasImages = dock.resultImages.length > 0;
  return (
    <section id="dock" aria-labelledby="dock-h" className="mt-12 scroll-mt-4 print:mt-6">
      <div className="rounded-3xl bg-main-soft px-4 py-6 sm:px-6 print:p-3">
        <p className="font-bold text-main-dark">デンタルドックとは</p>
        <h2 id="dock-h" className="text-[1.7rem] font-bold leading-snug sm:text-[2rem]">
          {dock.lead}
        </h2>
        <p className="mt-1 text-[1.1rem]">{dock.sub}</p>

        {/* なぜ必要か */}
        <h3 className="mt-6 text-[1.2rem] font-bold print:mt-3">なぜ、最初に検査をするの？</h3>
        <ol className="mt-2 flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] print:grid print:grid-cols-3">
          {dock.why.map((w, i) => (
            <li key={w.title} className="contents">
              <div className={`${card} flex items-center gap-3 p-4 lg:flex-col lg:items-start`}>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-main text-white">
                  <Icon name={w.icon} />
                </span>
                <div>
                  <p className="text-[1.15rem] font-bold leading-snug">{w.title}</p>
                  <p className="leading-normal">{w.text}</p>
                </div>
              </div>
              {i < dock.why.length - 1 && <Arrow />}
            </li>
          ))}
        </ol>

        {/* 何を調べるか */}
        <h3 className="mt-6 text-[1.2rem] font-bold print:mt-3">何を調べるの？</h3>
        <ul className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4 print:grid-cols-4">
          {dock.checks.map((c) => (
            <li key={c.name} className={`${card} p-3 text-center`}>
              <Icon name={c.icon} className="mx-auto h-12 w-12 text-main" />
              <p className="mt-1 text-[1.15rem] font-bold">{c.name}</p>
              <p className="leading-snug text-sub">{c.text}</p>
            </li>
          ))}
        </ul>

        {/* 3回の流れ */}
        <h3 className="mt-6 text-[1.2rem] font-bold print:mt-3">
          通院は3回<span className="font-normal text-sub">（{dock.pace}）</span>
        </h3>
        <ol className="mt-2 grid gap-2 sm:grid-cols-3 print:grid-cols-3">
          {dock.visits.map((v) => (
            <li
              key={v.no}
              className={`${card} p-4 ${v.no === 3 ? "border-2 !border-main" : ""}`}
            >
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-[1.25rem] font-bold text-main-dark">{v.no}回目</span>
                <span className="font-bold">{v.time}</span>
              </p>
              <p className="mt-1 text-[1.15rem] font-bold leading-snug">{v.title}</p>
              <p className="leading-normal">{v.text}</p>
            </li>
          ))}
        </ol>

        {/* 費用 */}
        <div className={`${card} mt-2 p-4 print:p-2`}>
          <p className="font-bold text-sub">
            費用の目安{dockStage.cost.kind === "amount" && `（${dockStage.cost.label}・税込）`}
          </p>
          <p className="text-[1.6rem] font-bold leading-tight text-main-dark">{costText(dockStage.cost)}</p>
          <CostBar cost={dockStage.cost} scaleMax={scaleMax} />
          <p className="mt-2 leading-normal text-sub">
            <span className="font-bold">ご注意：</span>
            {dockStage.risks}
          </p>
        </div>

        {/* 結果の例 */}
        {(hasImages || !isPublicBuild()) && (
          <>
            <h3 className="mt-6 text-[1.2rem] font-bold print:mt-3">{dock.resultTitle}</h3>
            {hasImages ? (
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {dock.resultImages.map((img) => (
                  <li key={img.src} className={`${card} overflow-hidden`}>
                    <a href={img.src} target="_blank" rel="noopener noreferrer">
                      <img src={img.src} alt={img.caption} loading="lazy" className="block w-full" />
                    </a>
                    <p className="p-3">{img.caption}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-2xl border-2 border-dashed border-main bg-card p-8 text-center text-sub print:p-2">
                ここに「結果の例」の画像が入ります{TBD}
              </p>
            )}
            <p className="mt-2 text-sub">※ 見本です。実際の内容は、お一人おひとり異なります。</p>
          </>
        )}
      </div>
    </section>
  );
}

function ModelCases() {
  if (shownCases.length === 0) return null;
  return (
    <section aria-labelledby="cases-h" className="mt-12 print:mt-6">
      <h2 id="cases-h" className={h2}>
        費用の例
      </h2>
      <p className="mt-1 text-sub">
        あくまで一例です。実際の内容と費用は、デンタルドックのあとにお一人ずつご相談します。
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
        {shownCases.map((c) => (
          <article key={c.id} className={`${card} p-5 print:p-2`}>
            {!c.confirmed && (
              <p className="mb-2 inline-block rounded border border-warn bg-warn-soft px-2 font-bold text-warn">
                サンプル（未確認）
              </p>
            )}
            <h3 className="font-bold leading-snug">{c.title}</h3>
            <p className="mt-2">{c.summary}</p>
            <p className="mt-3 font-bold text-sub">合計（税込）</p>
            <p className="text-[1.45rem] font-bold leading-tight text-main-dark">{yen(c.total)}</p>
            <p className="mt-1">
              期間 {c.months}／通院 {c.visits}
            </p>
            <p className="mt-3 text-sub">
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
    <section aria-labelledby="contact-h" className="mt-12 print:mt-6">
      <h2 id="contact-h" className={h2}>
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
      <dl className={`${card} mt-5 grid gap-x-6 gap-y-3 p-5 sm:grid-cols-[auto_1fr] print:mt-2 print:grid-cols-[auto_1fr] print:gap-y-1 print:p-2`}>
        <dt className="font-bold">電話</dt>
        <dd>{clinic.tel}</dd>
        <dt className="font-bold">診療時間</dt>
        <dd>{clinic.hours.length > 0 ? clinic.hours.map((h) => <div key={h}>{h}</div>) : TBD}</dd>
        <dt className="font-bold">休診日</dt>
        <dd>{clinic.closed || TBD}</dd>
        <dt className="font-bold">住所</dt>
        <dd>{clinic.address || TBD}</dd>
      </dl>
    </section>
  );
}

export default function JourneyPage() {
  return (
    <>
      {showSampleBanner && <SampleBanner text="確認中の内容です（院長の確認前の説明・金額が含まれています）" />}
      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 lg:px-5">
        <header className="mb-3">
          <p className="text-sub">{clinic.name}</p>
          <h1 className="text-[1.6rem] font-bold leading-snug lg:text-[1.9rem]">治療と費用の道のり</h1>
          <p className="mt-1">
            まず、お口全体を調べることから始めます。
            <span className="text-sub">（完全予約制・自由診療。金額はすべて税込）</span>
          </p>
        </header>

        <Journey />
        <Dock />
        <ModelCases />
        <Contact />

        <footer className="mt-10 border-t border-line pt-4 text-sub print:mt-3 print:pt-2">
          <p>
            当院は自由診療（保険のきかない診療）です。このページの金額は目安で、お口の状態によって内容と費用は変わります。
          </p>
          <p className="mt-1">
            {clinic.name}　電話 {clinic.tel}
          </p>
          <p className="no-print mt-4">
            <a href="/plan/new" className="text-sub underline">
              院内用：見積もりをつくる
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
