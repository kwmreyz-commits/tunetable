import { useState } from "react";
import { Icon } from "../components/Icon";
import { PriceInput } from "../components/PriceInput";
import { SampleBanner } from "../components/SampleBanner";
import { Stepper } from "../components/Stepper";
import { ToothChart } from "../components/ToothChart";
import { clinic } from "../data/clinic";
import { phases } from "../data/phases";
import type { Phase, Plan, PlanItem, Treatment, Variant } from "../data/types";
import {
  packQuote,
  resolve,
  resolveItem,
  summarize,
  toPlan,
  today,
  unitLabel,
  unitWord,
  unpackQuote,
  yen,
} from "../lib/plan";
import { builtin, priceFor, useSettings } from "../lib/settings";
import { isPrimary, sortTeeth, teethLabel, type Dentition } from "../lib/teeth";

const chip = (on: boolean) =>
  `min-h-12 rounded-xl border-2 px-3 py-1 text-left leading-tight ${
    on ? "border-main bg-main font-bold text-white" : "border-line bg-card text-ink"
  }`;

export default function PlanBuilderPage() {
  const [settings] = useSettings();
  const emptyPlan = (): Plan => ({
    segmentId: settings.segments[0].id,
    items: [],
    createdAt: today(),
  });
  // 「修正する」で戻ってきたときは、URL の # から読み込む
  const [plan, setPlan] = useState<Plan>(() => {
    const q = unpackQuote(window.location.hash, builtin);
    return q ? toPlan(q, settings) : emptyPlan();
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [lastTeeth, setLastTeeth] = useState<number[]>([]);
  const [dentition, setDentition] = useState<Dentition>("permanent");
  const [findingId, setFindingId] = useState("");
  const [phase, setPhase] = useState<Phase>(1);
  const [pending, setPending] = useState<string | null>(null); // 種類えらび中の治療
  const [editing, setEditing] = useState<number | null>(null);

  const segment = settings.segments.find((s) => s.id === plan.segmentId) ?? settings.segments[0];
  const quote = resolve(plan, settings);
  const summary = summarize(quote);
  const lines = plan.items.map((it) => resolveItem(it, segment.id, settings));

  // 図に出す印：治療が入っている歯 → いちばん早い段階
  const marks: Record<number, Phase> = {};
  for (const l of quote.lines)
    for (const t of l.teeth) marks[t] = Math.min(marks[t] ?? 3, l.phase) as Phase;

  const menu = settings.treatments.filter(
    (t) => t.enabled && t.name.trim() && t.id !== settings.maintenance.treatmentId,
  );
  const toothMenu = menu.filter((t) => t.kind !== "mouth");
  const mouthMenu = menu.filter((t) => t.kind === "mouth");
  const hasTeeth = selected.length > 0;
  const priceOf = (v: Variant) => priceFor(v, segment.id, settings.segments);

  const setItems = (items: PlanItem[]) => setPlan({ ...plan, items });
  const updateItem = (i: number, patch: Partial<PlanItem>) =>
    setItems(plan.items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const toggleTooth = (fdi: number) => {
    setPending(null);
    setSelected((s) => (s.includes(fdi) ? s.filter((x) => x !== fdi) : [...s, fdi]));
  };

  const add = (t: Treatment, v: Variant) => {
    const same = plan.items.findIndex(
      (it) =>
        t.kind === "mouth" &&
        it.treatmentId === t.id &&
        it.variantId === v.id &&
        it.phase === phase &&
        (it.findingId ?? "") === findingId,
    );
    if (same >= 0) updateItem(same, { qty: Math.min(99, plan.items[same].qty + 1) });
    else
      setItems([
        ...plan.items,
        {
          treatmentId: t.id,
          variantId: v.id,
          teeth: t.kind === "mouth" ? [] : sortTeeth(selected),
          qty: 1,
          phase,
          findingId: findingId || undefined,
        },
      ]);
    if (t.kind !== "mouth") {
      setLastTeeth(selected);
      setSelected([]);
    }
    setPending(null);
    setFindingId("");
  };
  const pick = (t: Treatment) =>
    t.variants.length === 1 ? add(t, t.variants[0]) : setPending(pending === t.id ? null : t.id);

  const show = () => {
    const q = resolve({ ...plan, createdAt: today() }, settings);
    window.location.href = `/plan#${packQuote(q, builtin)}`;
  };

  const treatmentButton = (t: Treatment, disabled: boolean) => {
    const prices = t.variants.map(priceOf);
    const open = pending === t.id;
    return (
      <div key={t.id} className={open ? "col-span-full" : ""}>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={t.variants.length > 1 ? open : undefined}
          onClick={() => pick(t)}
          className={`flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left leading-tight ${
            open
              ? "border-main bg-main-soft"
              : "border-main bg-card active:bg-main-soft disabled:border-line disabled:bg-paper disabled:text-sub"
          }`}
        >
          <span className="font-bold">{t.name}</span>
          <span className="shrink-0 text-right">
            {t.variants.length > 1
              ? `${yen(Math.min(...prices))}〜`
              : `${unitLabel(t)} ${yen(prices[0])}`}
          </span>
        </button>
        {open && (
          <div className="mt-2 grid gap-2 rounded-xl bg-main-soft p-2 sm:grid-cols-2">
            <p className="col-span-full font-bold">種類をえらぶ</p>
            {t.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => add(t, v)}
                className="flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 border-main bg-card px-3 text-left leading-tight active:bg-main active:text-white"
              >
                <span className="font-bold">{v.name || "標準"}</span>
                <span className="shrink-0">{yen(priceOf(v))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {quote.lines.some((l) => !l.t.confirmed) && <SampleBanner />}
      <main className="mx-auto max-w-[1240px] px-4 pb-32 pt-4 lg:px-5">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <p className="text-sub">{clinic.name}・院内用</p>
            <h1 className="text-[1.5rem] font-bold leading-snug">見積もりをつくる</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="料金の区分" className="flex rounded-xl border-2 border-main p-0.5">
              {settings.segments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={s.id === segment.id}
                  onClick={() => setPlan({ ...plan, segmentId: s.id })}
                  className={`min-h-11 rounded-lg px-4 font-bold ${
                    s.id === segment.id ? "bg-main text-white" : "text-main-dark"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <a
              href="/settings"
              className="inline-flex min-h-12 items-center gap-1 rounded-xl border-2 border-line bg-card px-3 text-ink no-underline"
            >
              <Icon name="gear" className="h-6 w-6" />
              料金の設定
            </a>
          </div>
        </header>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* 左：歯の図 */}
          <section aria-labelledby="chart-h" className="lg:sticky lg:top-3 lg:self-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="chart-h" className="text-[1.2rem] font-bold">
                1. 歯をえらぶ
              </h2>
              <div role="group" aria-label="歯の種類" className="flex rounded-xl border-2 border-line p-0.5">
                {(["permanent", "primary"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={dentition === d}
                    onClick={() => setDentition(d)}
                    className={`min-h-11 rounded-lg px-3 ${
                      dentition === d ? "bg-ink font-bold text-white" : "text-ink"
                    }`}
                  >
                    {d === "permanent" ? "大人の歯" : "乳歯"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 rounded-2xl border border-line bg-card p-2">
              <ToothChart
                dentition={dentition}
                selected={selected}
                marks={marks}
                onToggle={toggleTooth}
                className="mx-auto max-w-[520px]"
              />
            </div>
            <p className="mt-2 text-sub">
              歯を押すとえらべます（何本でも）。色のついた歯は、すでに治療が入っている歯です。
            </p>
            {selected.some((t) => isPrimary(t) !== (dentition === "primary")) && (
              <p className="text-sub">もう一方の図でえらんだ歯も、えらんだままになっています。</p>
            )}
          </section>

          {/* 右：治療を入れる → 見積もり */}
          <div>
            <section
              aria-labelledby="add-h"
              className={`rounded-2xl border-2 p-3 ${hasTeeth ? "border-ink bg-pick/25" : "border-line bg-card"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="add-h" className="text-[1.2rem] font-bold">
                  2. 治療を入れる
                </h2>
                {hasTeeth ? (
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="min-h-11 rounded-xl border-2 border-line bg-card px-3"
                  >
                    えらび直す
                  </button>
                ) : (
                  lastTeeth.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelected(lastTeeth)}
                      className="min-h-11 rounded-xl border-2 border-main bg-card px-3 font-bold text-main-dark"
                    >
                      同じ歯にもう1つ（{teethLabel(lastTeeth)}）
                    </button>
                  )
                )}
              </div>
              <p className="mt-1 text-[1.15rem] font-bold" aria-live="polite">
                {hasTeeth ? `えらんだ歯：${teethLabel(selected)}` : "歯をえらぶか、お口全体の治療をえらんでください"}
              </p>

              <h3 className="mt-3 font-bold">ドックでわかった状態（治療の理由）</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {settings.findings.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={findingId === f.id}
                    onClick={() => setFindingId(findingId === f.id ? "" : f.id)}
                    className={chip(findingId === f.id)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h3 className="font-bold">段階</h3>
                {phases.map((ph) => (
                  <button
                    key={ph.no}
                    type="button"
                    aria-pressed={phase === ph.no}
                    onClick={() => setPhase(ph.no)}
                    className={chip(phase === ph.no)}
                  >
                    {ph.mark}
                    {ph.name}
                  </button>
                ))}
              </div>

              <h3 className="mt-3 font-bold">
                歯ごとの治療
                {!hasTeeth && <span className="font-normal text-sub">（先に歯をえらんでください）</span>}
              </h3>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {toothMenu.map((t) => treatmentButton(t, !hasTeeth))}
              </div>

              <h3 className="mt-3 font-bold">お口全体の治療</h3>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {mouthMenu.map((t) => treatmentButton(t, false))}
              </div>
            </section>

            <section aria-labelledby="plan-h" className="mt-6">
              <h2 id="plan-h" className="text-[1.2rem] font-bold">
                3. 見積もり（{quote.lines.length}項目・{segment.name}）
              </h2>
              {quote.lines.length === 0 && (
                <p className="mt-2 rounded-2xl border-2 border-dashed border-line p-5 text-center text-sub">
                  まだ何も入っていません。
                </p>
              )}
              {phases.map((ph) => {
                const rows = plan.items
                  .map((item, index) => ({ item, index, line: lines[index] }))
                  .filter((r) => r.line && r.item.phase === ph.no);
                if (rows.length === 0) return null;
                return (
                  <div key={ph.no} className="mt-3">
                    <h3 className="flex items-baseline justify-between border-b-2 border-main pb-1 font-bold">
                      <span>
                        {ph.mark} {ph.name}
                      </span>
                      <span>{yen(summary.byPhase[ph.no])}</span>
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {rows.map(({ item, index, line }) => {
                        const l = line!;
                        const count = l.t.kind === "perTooth" ? l.teeth.length : l.t.kind === "teethSet" ? 1 : l.qty;
                        const t = settings.treatments.find((x) => x.id === item.treatmentId)!;
                        const v = t.variants.find((x) => x.id === l.variantId) ?? t.variants[0];
                        const open = editing === index;
                        return (
                          <li key={index} className="rounded-2xl border border-line bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="leading-snug">
                                <p className="font-bold">
                                  {l.t.name}
                                  {l.variantName && `（${l.variantName}）`}
                                </p>
                                <p>
                                  {l.teeth.length > 0 ? teethLabel(l.teeth) : "お口全体"}
                                  {l.finding && <span className="text-sub">　理由：{l.finding.name}</span>}
                                </p>
                                <p className="text-sub">
                                  {yen(l.unitPrice)} × {count}
                                  {unitWord(l.t)}
                                  {item.priceOverride !== undefined && "（値段を直しています）"}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[1.15rem] font-bold text-main-dark">
                                  {yen(l.unitPrice * count)}
                                </p>
                                <button
                                  type="button"
                                  aria-expanded={open}
                                  onClick={() => setEditing(open ? null : index)}
                                  className="mt-1 min-h-11 rounded-xl border-2 border-line px-3"
                                >
                                  {open ? "とじる" : "直す"}
                                </button>
                              </div>
                            </div>

                            {open && (
                              <div className="mt-3 space-y-3 border-t border-line pt-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold">段階</span>
                                  {phases.map((p) => (
                                    <button
                                      key={p.no}
                                      type="button"
                                      aria-pressed={item.phase === p.no}
                                      onClick={() => updateItem(index, { phase: p.no })}
                                      className={chip(item.phase === p.no)}
                                    >
                                      {p.mark}
                                      {p.name}
                                    </button>
                                  ))}
                                </div>
                                {t.variants.length > 1 && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold">種類</span>
                                    {t.variants.map((x) => (
                                      <button
                                        key={x.id}
                                        type="button"
                                        aria-pressed={x.id === v.id}
                                        onClick={() =>
                                          updateItem(index, { variantId: x.id, priceOverride: undefined })
                                        }
                                        className={chip(x.id === v.id)}
                                      >
                                        {x.name || "標準"}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {l.t.kind === "mouth" && (
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold">数</span>
                                    <Stepper
                                      label={`${l.t.name}の数`}
                                      value={item.qty}
                                      unit={unitWord(l.t)}
                                      onChange={(n) => updateItem(index, { qty: n ?? 1 })}
                                    />
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold">{unitLabel(l.t)}の値段</span>
                                  <PriceInput
                                    label={`${l.t.name}の値段`}
                                    className="w-40"
                                    value={item.priceOverride}
                                    placeholder={priceOf(v).toLocaleString("ja-JP")}
                                    onChange={(n) => updateItem(index, { priceOverride: n })}
                                  />
                                  <span className="text-sub">空欄なら設定の値段（{yen(priceOf(v))}）</span>
                                </div>
                                <label className="block">
                                  <span className="font-bold">理由</span>
                                  <select
                                    className="mt-1 block h-12 w-full rounded-xl border-2 border-line bg-card px-2"
                                    value={item.findingId ?? ""}
                                    onChange={(e) =>
                                      updateItem(index, { findingId: e.target.value || undefined })
                                    }
                                  >
                                    <option value="">（えらばない）</option>
                                    {settings.findings.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="font-bold">ドックでわかったこと（ひとこと）</span>
                                  <span className="block text-sub">
                                    例：レントゲンで根の先に影がありました。お名前は書かないでください。
                                  </span>
                                  <input
                                    type="text"
                                    maxLength={80}
                                    className="mt-1 h-12 w-full rounded-xl border-2 border-line bg-card px-3"
                                    value={item.reason ?? ""}
                                    onChange={(e) =>
                                      updateItem(index, { reason: e.target.value || undefined })
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditing(null);
                                    setItems(plan.items.filter((_, k) => k !== index));
                                  }}
                                  className="min-h-12 rounded-xl border-2 border-danger px-4 font-bold text-danger"
                                >
                                  この項目を外す
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </section>

            <section aria-labelledby="term-h" className="mt-6">
              <h2 id="term-h" className="text-[1.2rem] font-bold">
                4. 期間と通院
              </h2>
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
        </div>
      </main>

      {/* 下に固定：合計と「見せる」ボタン */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-main bg-card px-4 py-3">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="leading-tight">
            <span className="text-sub">合計（税込・{segment.name}）</span>
            <span className="block text-[1.4rem] font-bold text-main-dark" data-testid="total">
              {yen(summary.total)}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (plan.items.length === 0 || window.confirm("見積もりを空にしますか？")) {
                  history.replaceState(null, "", "/plan/new");
                  setPlan(emptyPlan());
                  setSelected([]);
                  setLastTeeth([]);
                  setEditing(null);
                }
              }}
              className="min-h-14 rounded-xl border-2 border-line px-4 text-sub"
            >
              空にする
            </button>
            <button
              type="button"
              onClick={show}
              disabled={quote.lines.length === 0}
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
