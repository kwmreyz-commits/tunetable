import { useEffect, useState } from "react";
import { SampleBanner } from "../components/SampleBanner";
import { clinic } from "../data/clinic";
import { phases, settings } from "../data/settings";
import { treatments } from "../data/treatments";
import type { Phase } from "../data/types";
import { decodePlan, findTreatment, mid, moneyText, summarize } from "../lib/plan";

// 色だけに頼らないよう、段階ごとに濃さと模様を変え、必ず ①②③ と金額を添える
const phaseBar: Record<Phase, string> = {
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

  const plan = decodePlan(hash, treatments);
  if (!plan || plan.items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-[1.5rem] font-bold">計画を開けませんでした</h1>
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

  const s = summarize(plan, treatments);
  const usedPhases = phases.filter((ph) => s.rows.some((r) => r.item.phase === ph.no));
  const totalMid = mid(s.total) || 1;
  const maint = findTreatment(treatments, settings.maintenance.treatmentId);
  const n = settings.maintenance.timesPerYear;
  const showSample =
    s.rows.some((r) => !r.treatment.confirmed) || (maint ? !maint.confirmed : false);
  const h2 = "text-[1.35rem] font-bold";

  return (
    <>
      {showSample && <SampleBanner />}
      <main className="mx-auto max-w-[900px] px-4 pb-16 pt-5">
        <header>
          <p className="text-sub">
            {clinic.name}　作成日 {plan.createdAt}
          </p>
          <h1 className="text-[1.5rem] font-bold leading-snug">あなたの治療計画</h1>
        </header>

        {/* 1. 合計と期間 */}
        <section aria-label="合計と期間" className="card mt-4 rounded-2xl border-2 border-main bg-card p-5">
          <p className="font-bold text-sub">合計（税込）</p>
          <p className="text-[1.9rem] font-bold leading-tight text-main-dark sm:text-[2.4rem]">
            {moneyText(s.total)}
          </p>
          {(plan.months || plan.visits) && (
            <p className="mt-2 text-[1.2rem] font-bold">
              {[
                plan.months && `約${plan.months}か月`,
                plan.visits && `通院 約${plan.visits}回`,
              ]
                .filter(Boolean)
                .join("／")}
            </p>
          )}
          {s.total.min !== s.total.max && (
            <p className="mt-2 text-sub">
              金額に幅があるのは、お口の状態や材料によって変わるためです。
            </p>
          )}
          {plan.note && (
            <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3">{plan.note}</p>
          )}
        </section>

        {/* 2. 段階ごとの内訳 */}
        <section aria-labelledby="phase-h" className="mt-10">
          <h2 id="phase-h" className={h2}>
            段階ごとの内訳
          </h2>
          <p className="text-sub">急ぐものから順に、3つの段階に分けています。</p>
          <div
            aria-hidden="true"
            className="mt-3 flex h-12 overflow-hidden rounded-xl border border-line"
          >
            {usedPhases.map((ph) => (
              <div
                key={ph.no}
                className={`flex min-w-10 items-center justify-center border-r border-white font-bold last:border-r-0 ${phaseBar[ph.no]}`}
                style={{ width: `${(mid(s.byPhase[ph.no]) / totalMid) * 100}%` }}
              >
                {ph.mark}
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {phases.map((ph) => {
              const used = usedPhases.includes(ph);
              return (
                <div
                  key={ph.no}
                  className={`card rounded-2xl border border-line bg-card p-4 ${used ? "" : "opacity-60"}`}
                >
                  <p className="flex items-center gap-2 font-bold">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line ${phaseBar[ph.no]}`}
                    >
                      {ph.mark}
                    </span>
                    {ph.name}
                  </p>
                  <p className="mt-1 text-[1.3rem] font-bold leading-tight text-main-dark">
                    {used ? moneyText(s.byPhase[ph.no]) : "なし"}
                  </p>
                  <p className="mt-1 leading-normal text-sub">{ph.why}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. 項目カード */}
        <section aria-labelledby="items-h" className="mt-10">
          <h2 id="items-h" className={h2}>
            治療の内容
          </h2>
          {usedPhases.map((ph) => (
            <div key={ph.no} className="mt-4">
              <h3 className="border-b-2 border-main pb-1 text-[1.15rem] font-bold">
                {ph.mark} {ph.name}
              </h3>
              <ul className="mt-3 space-y-3">
                {s.rows
                  .filter((r) => r.item.phase === ph.no)
                  .map(({ item, treatment: t, amount }, i) => (
                    <li key={i} className="card rounded-2xl border border-line bg-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <p className="text-[1.15rem] font-bold leading-snug">
                          {t.name}
                          {t.formalName && (
                            <span className="text-[1rem] font-normal text-sub">
                              （{t.formalName}）
                            </span>
                          )}
                        </p>
                        <p className="text-[1.25rem] font-bold text-main-dark">
                          {moneyText(amount)}
                        </p>
                      </div>
                      <p className="mt-1">{t.purpose}</p>
                      <dl className="mt-2 space-y-1 border-t border-line pt-2">
                        <div>
                          <dt className="inline font-bold">数：</dt>
                          <dd className="inline">
                            {t.unit === "一式" ? `${item.qty}式` : `${item.qty}${t.unit.slice(1)}`}
                            {item.qty > 1 &&
                              `（${t.unit}あたり ${moneyText({
                                min: amount.min / item.qty,
                                max: amount.max / item.qty,
                              })}）`}
                          </dd>
                        </div>
                        {t.visits && (
                          <div>
                            <dt className="inline font-bold">通院の目安：</dt>
                            <dd className="inline">{t.visits}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="inline font-bold">主なリスク・注意点：</dt>
                          <dd className="inline">{t.risks}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>

        {/* 4. 支払いの見え方 */}
        <section aria-labelledby="pay-h" className="mt-10">
          <h2 id="pay-h" className={h2}>
            お支払いの見え方
          </h2>
          <div className="mt-3 space-y-3">
            {settings.payment.lumpSum && (
              <div className="card rounded-2xl border border-line bg-card p-4">
                <p className="font-bold">一括でお支払いの場合</p>
                <p className="text-[1.25rem] font-bold text-main-dark">{moneyText(s.total)}</p>
              </div>
            )}
            {settings.payment.perPhase && (
              <div className="card rounded-2xl border border-line bg-card p-4">
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
                      <span className="font-bold text-main-dark">
                        {moneyText(s.byPhase[ph.no])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {settings.payment.installment && (
              <div className="card rounded-2xl border border-line bg-card p-4">
                <p className="font-bold">分割・ローンでお支払いの場合</p>
                <p>回数や月々の金額は、医院でご相談ください。</p>
              </div>
            )}
          </div>
        </section>

        {/* 5. 治療後 */}
        {maint && (
          <section aria-labelledby="after-h" className="mt-10">
            <h2 id="after-h" className={h2}>
              治療のあと（メンテナンス）
            </h2>
            <div className="card mt-3 rounded-2xl border border-line bg-card p-4">
              <p>{maint.purpose}</p>
              <p className="mt-2 font-bold">
                年間の目安（年{n}回・税込）
              </p>
              <p className="text-[1.25rem] font-bold text-main-dark">
                {moneyText({ min: maint.priceMin * n, max: maint.priceMax * n })}
              </p>
              <p className="text-sub">
                {maint.unit}あたり {moneyText({ min: maint.priceMin, max: maint.priceMax })}
                。上の合計には含まれていません。
              </p>
              <p className="mt-2">
                <span className="font-bold">ご注意：</span>
                {maint.risks}
              </p>
            </div>
          </section>
        )}

        {/* 6. 注記 */}
        <footer className="mt-10 border-t border-line pt-4">
          <p className="font-bold">
            この内容は相談用の概算です。正式な見積書は医院でお渡しします。
          </p>
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
              ← 計画を修正する（スタッフ用）
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
