import { useState } from "react";
import { SampleBanner } from "../components/SampleBanner";
import { Stepper } from "../components/Stepper";
import { clinic } from "../data/clinic";
import { phases, settings } from "../data/settings";
import { treatments } from "../data/treatments";
import type { Phase, Plan, PlanItem } from "../data/types";
import {
  decodePlan,
  encodePlan,
  findTreatment,
  moneyText,
  summarize,
  today,
} from "../lib/plan";

// メンテナンスは「治療後」の欄で見せるので、選ぶ一覧からは外す
const selectable = treatments.filter(
  (t) => t.id !== settings.maintenance.treatmentId,
);
const unitWord = { "1本": "本", "1回": "回", 一式: "式" } as const;

const emptyPlan = (): Plan => ({ items: [], createdAt: today() });

export default function PlanBuilderPage() {
  // 「修正する」で戻ってきたときは、URL の # から読み込む
  const [plan, setPlan] = useState<Plan>(
    () => decodePlan(window.location.hash, treatments) ?? emptyPlan(),
  );
  const summary = summarize(plan, treatments);

  const setItems = (items: PlanItem[]) => setPlan({ ...plan, items });
  const addItem = (treatmentId: string, phase: Phase) => {
    const i = plan.items.findIndex(
      (it) => it.treatmentId === treatmentId && it.phase === phase,
    );
    if (i >= 0) updateItem(i, { qty: Math.min(99, plan.items[i].qty + 1) });
    else setItems([...plan.items, { treatmentId, qty: 1, phase }]);
  };
  const updateItem = (index: number, patch: Partial<PlanItem>) =>
    setItems(plan.items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const removeItem = (index: number) =>
    setItems(plan.items.filter((_, i) => i !== index));

  const show = () => {
    window.location.href = `/plan#${encodePlan({ ...plan, createdAt: today() })}`;
  };

  return (
    <>
      {treatments.some((t) => !t.confirmed) && <SampleBanner />}
      <main className="mx-auto max-w-[1240px] px-4 pb-32 pt-5 lg:px-5">
        <header>
          <p className="text-sub">{clinic.name}・院内用</p>
          <h1 className="text-[1.5rem] font-bold leading-snug">治療計画をつくる</h1>
        </header>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* 左：治療をえらぶ */}
          <section aria-labelledby="pick-h">
            <h2 id="pick-h" className="text-[1.2rem] font-bold">
              1. 治療をえらぶ
            </h2>
            <p className="text-sub">段階のボタンを押すと、右の計画に入ります。</p>
            <ul className="mt-3 space-y-3">
              {selectable.map((t) => (
                <li key={t.id} className="rounded-2xl border border-line bg-card p-3">
                  <p className="font-bold leading-snug">
                    {t.name}
                    {t.formalName && (
                      <span className="font-normal text-sub">（{t.formalName}）</span>
                    )}
                  </p>
                  <p className="text-sub">
                    {t.unit}あたり {moneyText({ min: t.priceMin, max: t.priceMax })}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {phases.map((ph) => (
                      <button
                        key={ph.no}
                        type="button"
                        onClick={() => addItem(t.id, ph.no)}
                        className="min-h-12 rounded-xl border-2 border-main bg-main-soft px-1 font-bold leading-tight text-main-dark active:bg-main active:text-white"
                        aria-label={`${t.name}を「${ph.name}」に入れる`}
                      >
                        {ph.mark}
                        {ph.name}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 右：計画 */}
          <section aria-labelledby="plan-h">
            <h2 id="plan-h" className="text-[1.2rem] font-bold">
              2. 計画（{plan.items.length}項目）
            </h2>
            {plan.items.length === 0 && (
              <p className="mt-3 rounded-2xl border-2 border-dashed border-line p-6 text-center text-sub">
                まだ何も入っていません。
                <br />
                左から治療をえらんでください。
              </p>
            )}
            {phases.map((ph) => {
              const rows = plan.items
                .map((item, index) => ({ item, index }))
                .filter((r) => r.item.phase === ph.no);
              if (rows.length === 0) return null;
              return (
                <div key={ph.no} className="mt-4">
                  <h3 className="flex items-baseline justify-between border-b-2 border-main pb-1 font-bold">
                    <span>
                      {ph.mark} {ph.name}
                    </span>
                    <span>{moneyText(summary.byPhase[ph.no])}</span>
                  </h3>
                  <ul className="mt-2 space-y-3">
                    {rows.map(({ item, index }) => {
                      const t = findTreatment(treatments, item.treatmentId)!;
                      const amount = summary.rows.find((r) => r.item === item)!.amount;
                      return (
                        <li key={index} className="rounded-2xl border border-line bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold leading-snug">{t.name}</p>
                            <p className="shrink-0 font-bold text-main-dark">
                              {moneyText(amount)}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Stepper
                              label={`${t.name}の数`}
                              value={item.qty}
                              unit={unitWord[t.unit]}
                              onChange={(v) => updateItem(index, { qty: v ?? 1 })}
                            />
                            <label className="flex items-center gap-2">
                              <span className="sr-only">段階</span>
                              <select
                                className="h-12 rounded-xl border-2 border-line bg-card px-2"
                                value={item.phase}
                                onChange={(e) =>
                                  updateItem(index, { phase: Number(e.target.value) as Phase })
                                }
                              >
                                {phases.map((p) => (
                                  <option key={p.no} value={p.no}>
                                    {p.mark}
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="ml-auto h-12 rounded-xl border-2 border-line px-3 text-sub"
                              aria-label={`${t.name}を外す`}
                            >
                              外す
                            </button>
                          </div>
                          <label className="mt-2 flex flex-wrap items-center gap-2">
                            <span>{t.unit}の金額</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1100}
                              className="h-12 w-36 rounded-xl border-2 border-line bg-card px-3 text-right"
                              placeholder="目安の幅"
                              value={item.priceOverride ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = Math.round(Number(v));
                                updateItem(index, {
                                  priceOverride:
                                    v === "" || !Number.isFinite(n) || n < 0 ? undefined : n,
                                });
                              }}
                            />
                            <span>円（税込）</span>
                            <span className="basis-full text-sub">
                              空欄のときは目安の幅（
                              {moneyText({ min: t.priceMin, max: t.priceMax })}）で計算します
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            <h2 className="mt-8 text-[1.2rem] font-bold">3. 期間と通院</h2>
            <div className="mt-2 space-y-3 rounded-2xl border border-line bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">治療の期間</span>
                <Stepper
                  label="治療の期間"
                  value={plan.months}
                  unit="か月"
                  max={120}
                  emptyText="未定"
                  onChange={(v) => setPlan({ ...plan, months: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">通院の回数</span>
                <Stepper
                  label="通院の回数"
                  value={plan.visits}
                  unit="回"
                  max={200}
                  emptyText="未定"
                  onChange={(v) => setPlan({ ...plan, visits: v })}
                />
              </div>
              <label className="block">
                <span className="font-bold">ひとことメモ（なくてもよい）</span>
                <span className="block text-sub">
                  治療の進め方などを書きます。お名前や連絡先は書かないでください。
                </span>
                <textarea
                  className="mt-1 w-full rounded-xl border-2 border-line bg-card p-3"
                  rows={2}
                  maxLength={300}
                  value={plan.note ?? ""}
                  onChange={(e) => setPlan({ ...plan, note: e.target.value || undefined })}
                />
              </label>
            </div>
          </section>
        </div>
      </main>

      {/* 下に固定：合計と「見せる」ボタン */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-main bg-card px-4 py-3">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="leading-tight">
            <span className="text-sub">合計（税込）</span>
            <span className="block text-[1.3rem] font-bold text-main-dark">
              {moneyText(summary.total)}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (plan.items.length === 0 || window.confirm("計画を空にしますか？")) {
                  history.replaceState(null, "", "/plan/new");
                  setPlan(emptyPlan());
                }
              }}
              className="min-h-14 rounded-xl border-2 border-line px-4 text-sub"
            >
              空にする
            </button>
            <button
              type="button"
              onClick={show}
              disabled={plan.items.length === 0}
              className="min-h-14 rounded-xl bg-main px-6 text-[1.1rem] font-bold text-white disabled:bg-line"
            >
              患者さんに見せる →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
