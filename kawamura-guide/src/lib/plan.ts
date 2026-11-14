import LZString from "lz-string";
import type { Phase, Plan, PlanItem, Treatment } from "../data/types";

// 金額の幅。min と max が同じなら1つの金額。
export type Money = { min: number; max: number };

export const ZERO: Money = { min: 0, max: 0 };
export const add = (a: Money, b: Money): Money => ({
  min: a.min + b.min,
  max: a.max + b.max,
});
export const mid = (m: Money) => (m.min + m.max) / 2;

// 例：「110,000円」「110,000〜220,000円」
export function moneyText(m: Money): string {
  const f = (n: number) => n.toLocaleString("ja-JP");
  return m.min === m.max ? `${f(m.min)}円` : `${f(m.min)}〜${f(m.max)}円`;
}

export function findTreatment(
  treatments: Treatment[],
  id: string,
): Treatment | undefined {
  return treatments.find((t) => t.id === id);
}

// 1単位あたりの金額
export function unitPrice(item: PlanItem, t: Treatment): Money {
  return item.priceOverride !== undefined
    ? { min: item.priceOverride, max: item.priceOverride }
    : { min: t.priceMin, max: t.priceMax };
}

// 1項目の金額（単価 × 数）
export function itemAmount(item: PlanItem, t: Treatment): Money {
  const u = unitPrice(item, t);
  return { min: u.min * item.qty, max: u.max * item.qty };
}

export type PlanSummary = {
  rows: { item: PlanItem; treatment: Treatment; amount: Money }[];
  byPhase: Record<Phase, Money>;
  total: Money;
};

// 合計・段階別・項目別を1か所で計算する（画面はすべてこれを使う）
export function summarize(plan: Plan, treatments: Treatment[]): PlanSummary {
  const rows = plan.items.flatMap((item) => {
    const treatment = findTreatment(treatments, item.treatmentId);
    return treatment
      ? [{ item, treatment, amount: itemAmount(item, treatment) }]
      : [];
  });
  const byPhase: Record<Phase, Money> = { 1: ZERO, 2: ZERO, 3: ZERO };
  for (const r of rows) byPhase[r.item.phase] = add(byPhase[r.item.phase], r.amount);
  const total = add(add(byPhase[1], byPhase[2]), byPhase[3]);
  return { rows, byPhase, total };
}

export const today = () => new Date().toISOString().slice(0, 10);

// ───────── URL（# 以降）への出し入れ。サーバーには保存しない ─────────

type Packed = {
  v: 1;
  i: [string, number, number, number?][]; // [治療ID, 数, 段階, 単価の上書き]
  m?: number;
  n?: number;
  t?: string;
  c: string;
};

export function encodePlan(plan: Plan): string {
  const packed: Packed = {
    v: 1,
    i: plan.items.map((it) =>
      it.priceOverride !== undefined
        ? [it.treatmentId, it.qty, it.phase, it.priceOverride]
        : [it.treatmentId, it.qty, it.phase],
    ),
    m: plan.months,
    n: plan.visits,
    t: plan.note || undefined,
    c: plan.createdAt,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(packed));
}

const posInt = (x: unknown, max: number): number | undefined =>
  typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= max
    ? x
    : undefined;

// 壊れたデータや知らない治療IDは捨てる。読めなければ null。
export function decodePlan(hash: string, treatments: Treatment[]): Plan | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(
      hash.replace(/^#/, ""),
    );
    if (!json) return null;
    const p = JSON.parse(json) as Partial<Packed>;
    if (p.v !== 1 || !Array.isArray(p.i)) return null;
    const items: PlanItem[] = [];
    for (const row of p.i) {
      if (!Array.isArray(row)) continue;
      const [id, qty, phase, price] = row;
      const q = posInt(qty, 99);
      if (typeof id !== "string" || !findTreatment(treatments, id) || !q) continue;
      if (phase !== 1 && phase !== 2 && phase !== 3) continue;
      const item: PlanItem = { treatmentId: id, qty: q, phase };
      if (typeof price === "number" && Number.isFinite(price) && price >= 0)
        item.priceOverride = Math.round(price);
      items.push(item);
    }
    return {
      items,
      months: posInt(p.m, 999),
      visits: posInt(p.n, 999),
      note: typeof p.t === "string" ? p.t.slice(0, 300) : undefined,
      createdAt: typeof p.c === "string" ? p.c.slice(0, 10) : today(),
    };
  } catch {
    return null;
  }
}
