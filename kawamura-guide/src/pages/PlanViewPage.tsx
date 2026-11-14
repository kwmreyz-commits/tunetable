import { useEffect, useState } from "react";
import { PlanPrint } from "../components/PlanPrint";
import { SampleBanner } from "../components/SampleBanner";
import { TakeHome } from "../components/TakeHome";
import { ToothChart } from "../components/ToothChart";
import { clinic } from "../data/clinic";
import { stages } from "../data/journey";
import { phases } from "../data/phases";
import type { Phase } from "../data/types";
import { summarize, unitLabel, unitWord, unpackQuote, yen } from "../lib/plan";
import { builtin } from "../lib/settings";
import { qrSvg } from "../lib/share";
import { isPrimary, teethLabel } from "../lib/teeth";

// 色だけに頼らないよう、段階ごとに濃さを変え、必ず ①②③ と金額を添える
export const phaseTone: Record<Phase, string> = {
  1: "bg-main text-white",
  2: "bg-main-mid text-white",
  3: "bg-main-soft text-main-dark",
};

export default function PlanViewPage() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  // QRコード（この画面と同じ内容を開くリンク）
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!unpackQuote(hash, builtin)) return;
    let alive = true;
    qrSvg(`${window.location.origin}/plan${hash}`).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [hash]);

  const quote = unpackQuote(hash, builtin);
  if (!quote || quote.lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-[1.5rem] font-bold">見積もりを開けませんでした</h1>
        <p className="mt-3">
          リンクが途中で切れているかもしれません。お手数ですが、医院までお問い合わせください。
        </p>
        <p className="mt-3 font-bold">
          {clinic.name}　電話 {clinic.tel}
        </p>
        <p className="mt-6">
          <a href="/" className="underline">
            治療と費用の道のりを見る
          </a>
        </p>
      </main>
    );
  }

  const s = summarize(quote);
  const usedPhases = phases.filter((ph) => s.rows.some((r) => r.line.phase === ph.no));
  const marks: Record<number, Phase> = {};
  for (const l of quote.lines)
    for (const t of l.teeth) marks[t] = Math.min(marks[t] ?? 3, l.phase) as Phase;
  const teeth = Object.keys(marks).map(Number);
  const charts = [
    teeth.some((t) => !isPrimary(t)) && ("permanent" as const),
    teeth.some(isPrimary) && ("primary" as const),
  ].filter((x) => !!x);
  const mt = quote.maintenance;
  const showSample = s.rows.some((r) => !r.line.t.confirmed) || (mt ? !mt.t.confirmed : false);
  const h2 = "text-[1.35rem] font-bold";
  const card = "card rounded-2xl border border-line bg-card";

  return (
    <>
      {showSample && <SampleBanner />}
      <main className="mx-auto max-w-[900px] px-4 pb-32 pt-5 print:hidden">
        <header>
          <p className="text-sub">
            {clinic.name}　作成日 {quote.createdAt}
          </p>
          <h1 className="text-[1.5rem] font-bold leading-snug">あなたの治療計画とお見積もり</h1>
          <p className="mt-1">デンタルドックの結果をもとにした、これからの治療と費用です。</p>
        </header>

        {/* 道のりの中で、いまどこにいるか */}
        <ol aria-label="治療の道のり" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stages.map((st) => (
            <li
              key={st.id}
              aria-current={st.no === 3 ? "step" : undefined}
              className={`rounded-xl border-2 px-3 py-2 leading-snug ${
                st.no === 3
                  ? "border-main bg-main-soft font-bold text-main-dark"
                  : "border-line bg-card text-sub"
              }`}
            >
              <span className="block">
                {st.no}. {st.name}
              </span>
              <span className="block">
                {st.no < 3 ? "✓ すみ" : st.no === 3 ? "▶ この計画" : "治療のあと"}
              </span>
            </li>
          ))}
        </ol>

        {/* 1. 合計と期間 */}
        <section aria-label="合計と期間" className={`${card} mt-4 border-2 !border-main p-5`}>
          <p className="font-bold text-sub">合計（税込・{quote.segment.name}）</p>
          <p className="text-[2.2rem] font-bold leading-tight text-main-dark sm:text-[2.6rem]" data-testid="total">
            {yen(s.total)}
          </p>
          {(quote.months || quote.visits) && (
            <p className="mt-2 text-[1.2rem] font-bold">
              {[quote.months && `約${quote.months}か月`, quote.visits && `通院 約${quote.visits}回`]
                .filter(Boolean)
                .join("／")}
            </p>
          )}
          {quote.note && (
            <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3">{quote.note}</p>
          )}
        </section>

        {/* 2. どこを・いつ */}
        <section aria-labelledby="where-h" className="mt-10">
          <h2 id="where-h" className={h2}>
            どこを、いつ治すか
          </h2>
          <p className="text-sub">急ぐものから順に、3つの段階に分けています。</p>
          <div className="mt-3 grid items-start gap-4 sm:grid-cols-2">
            {charts.length > 0 && (
              <div className={`${card} p-2`}>
                {charts.map((d) => (
                  <ToothChart key={d} dentition={d} marks={marks} className="mx-auto max-w-[380px]" />
                ))}
                <p className="px-2 pb-1 text-center text-sub">色のついた歯が、治療する歯です。</p>
              </div>
            )}
            <div className={charts.length > 0 ? "" : "sm:col-span-2"}>
              <div aria-hidden="true" className="flex h-12 overflow-hidden rounded-xl border border-line">
                {usedPhases.map((ph) => (
                  <div
                    key={ph.no}
                    className={`flex min-w-10 items-center justify-center border-r border-white font-bold last:border-r-0 ${phaseTone[ph.no]}`}
                    style={{ width: `${(s.byPhase[ph.no] / (s.total || 1)) * 100}%` }}
                  >
                    {ph.mark}
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-3">
                {phases.map((ph) => {
                  const used = usedPhases.includes(ph);
                  return (
                    <div key={ph.no} className={`${card} p-4 ${used ? "" : "opacity-60"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 font-bold">
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line ${phaseTone[ph.no]}`}
                          >
                            {ph.mark}
                          </span>
                          {ph.name}
                        </p>
                        <p className="text-[1.3rem] font-bold leading-tight text-main-dark">
                          {used ? yen(s.byPhase[ph.no]) : "なし"}
                        </p>
                      </div>
                      <p className="mt-1 leading-normal text-sub">{ph.why}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. 計算のまとめ */}
        <section aria-labelledby="calc-h" className="mt-10">
          <h2 id="calc-h" className={h2}>
            計算のまとめ
          </h2>
          <div className={`${card} mt-3 overflow-hidden leading-snug`}>
            {usedPhases.map((ph) => (
              <div key={ph.no}>
                <h3 className="bg-paper px-3 py-2 font-bold">
                  {ph.mark} {ph.name}
                </h3>
                <ul>
                  {s.rows
                    .filter((r) => r.line.phase === ph.no)
                    .map(({ line: l, count, amount }, i) => (
                      <li key={i} className="flex items-start gap-3 border-t border-line px-3 py-2">
                        <p className="min-w-0 flex-1">
                          <span className="font-bold">
                            {l.t.name}
                            {l.variantName && `（${l.variantName}）`}
                          </span>
                          <span className="block text-sub">
                            {l.teeth.length > 0 ? teethLabel(l.teeth) : "お口全体"}
                          </span>
                          <span className="block text-sub sm:hidden">
                            {yen(l.unitPrice)} × {count}
                            {unitWord(l.t)}
                          </span>
                        </p>
                        <p className="hidden shrink-0 text-right text-sub sm:block">
                          {yen(l.unitPrice)} × {count}
                          {unitWord(l.t)}
                        </p>
                        <p className="w-28 shrink-0 text-right font-bold sm:w-32">{yen(amount)}</p>
                      </li>
                    ))}
                </ul>
                <p className="flex justify-end gap-3 border-t border-line px-3 py-2">
                  <span className="text-sub">{ph.mark} の小計</span>
                  <span className="w-28 text-right font-bold text-main-dark sm:w-32">
                    {yen(s.byPhase[ph.no])}
                  </span>
                </p>
              </div>
            ))}
            <p className="flex items-baseline justify-end gap-3 border-t-2 border-main bg-main-soft px-3 py-3">
              <span className="font-bold">合計（税込）</span>
              <span className="text-[1.25rem] font-bold text-main-dark">{yen(s.total)}</span>
            </p>
          </div>
        </section>

        {/* 4. なぜ、この治療か */}
        <section aria-labelledby="items-h" className="mt-10">
          <h2 id="items-h" className={h2}>
            なぜ、この治療が必要か
          </h2>
          <p className="text-sub">デンタルドックでわかったことと、そのための治療です。</p>
          {usedPhases.map((ph) => (
            <div key={ph.no} className="mt-4">
              <h3 className="border-b-2 border-main pb-1 text-[1.15rem] font-bold">
                {ph.mark} {ph.name}
              </h3>
              <ul className="mt-3 space-y-3">
                {s.rows
                  .filter((r) => r.line.phase === ph.no)
                  .map(({ line: l, count, amount }, i) => (
                    <li key={i} className={`${card} p-4`}>
                      <p className="text-[1.15rem] font-bold">
                        {l.teeth.length > 0 ? teethLabel(l.teeth) : "お口全体"}
                      </p>
                      <div className="mt-2 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
                        <div className="rounded-xl bg-paper p-3">
                          <p className="font-bold text-sub">ドックでわかったこと</p>
                          {l.finding ? (
                            <>
                              <p className="text-[1.15rem] font-bold leading-snug">{l.finding.name}</p>
                              <p className="leading-normal">{l.finding.note}</p>
                            </>
                          ) : (
                            !l.reason && <p className="leading-normal">診察のときにご説明します。</p>
                          )}
                          {l.reason && <p className="mt-1 leading-normal">{l.reason}</p>}
                        </div>
                        <p
                          aria-hidden="true"
                          className="flex items-center justify-center text-[1.6rem] leading-none text-main"
                        >
                          <span className="sm:hidden">↓</span>
                          <span className="hidden sm:inline">→</span>
                        </p>
                        <div className="rounded-xl border-2 border-main bg-main-soft p-3">
                          <p className="font-bold text-sub">だから、この治療</p>
                          <p className="text-[1.15rem] font-bold leading-snug">
                            {l.t.name}
                            {l.variantName && `（${l.variantName}）`}
                          </p>
                          <p className="leading-normal">{l.t.purpose}</p>
                        </div>
                      </div>
                      <p className="mt-3 flex flex-wrap items-baseline justify-end gap-x-3 border-t border-line pt-2">
                        <span>
                          {unitLabel(l.t)} {yen(l.unitPrice)} × {count}
                          {unitWord(l.t)} ＝
                        </span>
                        <span className="text-[1.3rem] font-bold text-main-dark">{yen(amount)}</span>
                      </p>
                      <dl className="mt-1 space-y-1">
                        {l.t.visits && (
                          <div>
                            <dt className="inline font-bold">通院の目安：</dt>
                            <dd className="inline">{l.t.visits}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline font-bold">主なリスク・注意点：</dt>
                          <dd className="inline">{l.t.risks}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        {/* 5. 支払い */}
        <section aria-labelledby="pay-h" className="mt-10">
          <h2 id="pay-h" className={h2}>
            お支払いの見え方
          </h2>
          <div className="mt-3 space-y-3">
            {quote.payment.lumpSum && (
              <div className={`${card} p-4`}>
                <p className="font-bold">一括でお支払いの場合</p>
                <p className="text-[1.25rem] font-bold text-main-dark">{yen(s.total)}</p>
              </div>
            )}
            {quote.payment.perPhase && (
              <div className={`${card} p-4`}>
                <p className="font-bold">段階ごとにお支払いの場合</p>
                <ul className="mt-1">
                  {usedPhases.map((ph) => (
                    <li
                      key={ph.no}
                      className="flex flex-wrap justify-between gap-x-4 border-b border-line py-2 last:border-b-0"
                    >
                      <span>
                        {ph.mark} {ph.name}
                      </span>
                      <span className="font-bold text-main-dark">{yen(s.byPhase[ph.no])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {quote.payment.installment && (
              <div className={`${card} p-4`}>
                <p className="font-bold">分割・ローンでお支払いの場合</p>
                <p>回数や月々の金額は、医院でご相談ください。</p>
              </div>
            )}
          </div>
        </section>

        {/* 6. 治療後 */}
        {mt && (
          <section aria-labelledby="after-h" className="mt-10">
            <h2 id="after-h" className={h2}>
              治療のあと（{mt.t.name}）
            </h2>
            <div className={`${card} mt-3 p-4`}>
              <p>{mt.t.purpose}</p>
              <p className="mt-2 font-bold">年間の目安（年{mt.timesPerYear}回・税込）</p>
              <p className="text-[1.25rem] font-bold text-main-dark">
                {yen(mt.price * mt.timesPerYear)}
              </p>
              <p className="text-sub">
                {unitLabel(mt.t)} {yen(mt.price)} × {mt.timesPerYear}回。上の合計には含まれていません。
              </p>
              <p className="mt-2">
                <span className="font-bold">ご注意：</span>
                {mt.t.risks}
              </p>
            </div>
          </section>
        )}

        <p className="mt-10 rounded-xl border-2 border-main bg-main-soft px-4 py-3 text-center font-bold text-main-dark">
          ご家族とも相談して、納得されてから治療に進みます。
          <br />
          わからないことは、何でもお尋ねください。
        </p>

        {/* 7. 注記 */}
        <footer className="mt-6 border-t border-line pt-4">
          <p className="font-bold">この内容は相談用の概算です。正式な見積書は医院でお渡しします。</p>
          <p className="mt-1 text-sub">
            当院は自由診療（保険のきかない診療）です。金額はすべて税込です。治療の結果には個人差があります。
          </p>
          <p className="mt-3">
            {clinic.name}　電話 {clinic.tel}
          </p>
          <p className="no-print mt-6">
            <a
              href={`/plan/new${hash}`}
              className="inline-flex min-h-12 items-center rounded-xl border-2 border-line px-4 text-sub no-underline"
            >
              ← 見積もりを修正する（スタッフ用）
            </a>
          </p>
        </footer>
      </main>
      <PlanPrint quote={quote} summary={s} marks={marks} charts={charts} qr={qr} />
      <TakeHome qr={qr} />
    </>
  );
}
