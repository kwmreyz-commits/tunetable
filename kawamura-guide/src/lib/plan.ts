import LZString from "lz-string";
import type {
  Finding,
  Phase,
  Plan,
  PlanItem,
  Quote,
  QuoteLine,
  QuoteTreatment,
  Segment,
  Settings,
  Treatment,
} from "../data/types";
import { priceFor } from "./settings";
import { isValidTooth, sortTeeth } from "./teeth";

export const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
export const today = () => new Date().toISOString().slice(0, 10);

type Countable = { t: { kind: Treatment["kind"] }; teeth: number[]; qty: number };

// 数：歯1本ごと → 歯の本数／まとめて一式 → 1／お口全体 → 回数
export const lineCount = (l: Countable) =>
  l.t.kind === "perTooth" ? l.teeth.length : l.t.kind === "teethSet" ? 1 : l.qty;
export const lineAmount = (l: QuoteLine) => l.unitPrice * lineCount(l);

type Unitable = Pick<Treatment, "kind" | "unit">;
export const unitLabel = (t: Unitable) =>
  t.kind === "perTooth" ? "1本" : t.kind === "teethSet" ? "一式" : t.unit;
export const unitWord = (t: Unitable) =>
  t.kind === "perTooth" ? "本" : unitLabel(t) === "1回" ? "回" : "式";

const snapshot = (t: Treatment): QuoteTreatment => ({
  id: t.id,
  name: t.name,
  formalName: t.formalName,
  purpose: t.purpose,
  risks: t.risks,
  visits: t.visits,
  kind: t.kind,
  unit: t.unit,
  confirmed: t.confirmed,
});

// 計画の1行を、設定をもとに「完成形」にする。設定に無い治療なら null。
export function resolveItem(
  item: PlanItem,
  segmentId: string,
  settings: Settings,
): QuoteLine | null {
  const t = settings.treatments.find((x) => x.id === item.treatmentId);
  if (!t) return null;
  const v = t.variants.find((x) => x.id === item.variantId) ?? t.variants[0];
  const teeth = t.kind === "mouth" ? [] : sortTeeth(item.teeth);
  if (t.kind !== "mouth" && teeth.length === 0) return null;
  return {
    t: snapshot(t),
    variantId: v.id,
    variantName: v.name,
    teeth,
    qty: t.kind === "mouth" ? Math.max(1, item.qty) : 1,
    phase: item.phase,
    unitPrice: item.priceOverride ?? priceFor(v, segmentId, settings.segments),
    finding: settings.findings.find((f) => f.id === item.findingId),
    reason: item.reason?.trim() || undefined,
  };
}

// 計画 → 見積もり（患者さんに渡す完成形）
export function resolve(plan: Plan, settings: Settings): Quote {
  const segment =
    settings.segments.find((s) => s.id === plan.segmentId) ?? settings.segments[0];
  const mt = settings.treatments.find((t) => t.id === settings.maintenance.treatmentId);
  return {
    segment,
    lines: plan.items.flatMap((it) => resolveItem(it, segment.id, settings) ?? []),
    months: plan.months,
    visits: plan.visits,
    note: plan.note?.trim() || undefined,
    createdAt: plan.createdAt,
    payment: { ...settings.payment },
    maintenance: mt
      ? {
          t: snapshot(mt),
          price: priceFor(mt.variants[0], segment.id, settings.segments),
          timesPerYear: settings.maintenance.timesPerYear,
        }
      : undefined,
  };
}

// 見積もり → 計画（「修正する」で戻るとき）。いまの設定に無い治療は外れる。
export function toPlan(quote: Quote, settings: Settings): Plan {
  const segment =
    settings.segments.find((s) => s.id === quote.segment.id) ?? settings.segments[0];
  const items: PlanItem[] = quote.lines.flatMap((l) => {
    const t = settings.treatments.find((x) => x.id === l.t.id);
    if (!t) return [];
    const v = t.variants.find((x) => x.id === l.variantId) ?? t.variants[0];
    const now = priceFor(v, segment.id, settings.segments);
    return [
      {
        treatmentId: t.id,
        variantId: v.id,
        teeth: l.teeth,
        qty: l.qty,
        phase: l.phase,
        priceOverride: l.unitPrice === now ? undefined : l.unitPrice,
        findingId: settings.findings.find((f) => f.id === l.finding?.id)?.id,
        reason: l.reason,
      },
    ];
  });
  return {
    segmentId: segment.id,
    items,
    months: quote.months,
    visits: quote.visits,
    note: quote.note,
    createdAt: quote.createdAt,
  };
}

export type QuoteSummary = {
  rows: { line: QuoteLine; count: number; amount: number }[];
  byPhase: Record<Phase, number>;
  total: number;
};

// 合計・段階別・項目別を1か所で計算する（画面も印刷もすべてこれを使う）
export function summarize(quote: Quote): QuoteSummary {
  const rows = quote.lines.map((line) => ({
    line,
    count: lineCount(line),
    amount: lineAmount(line),
  }));
  const byPhase: Record<Phase, number> = { 1: 0, 2: 0, 3: 0 };
  for (const r of rows) byPhase[r.line.phase] += r.amount;
  return { rows, byPhase, total: byPhase[1] + byPhase[2] + byPhase[3] };
}

// ───────── URL（# 以降）への出し入れ。サーバーには保存しない ─────────
//
// 患者さんのスマホには医院の設定が無いので、見積もりの中身をまるごと入れる。
// ただし、アプリに最初から入っている設定と同じ内容は ID だけにして、URL を短く保つ。

const KIND_CODE = ["perTooth", "teethSet", "mouth"] as const;
type Ref<T> = string | T; // 文字列なら「アプリ内の設定と同じ」
type TFull = [string, string, string, string, string, string, number, number, number];

const sameT = (a: QuoteTreatment, b: Treatment | undefined) =>
  !!b &&
  a.name === b.name &&
  a.formalName === b.formalName &&
  a.purpose === b.purpose &&
  a.risks === b.risks &&
  a.visits === b.visits &&
  a.kind === b.kind &&
  a.unit === b.unit &&
  a.confirmed === b.confirmed;

const packT = (t: QuoteTreatment, base: Settings): Ref<TFull> =>
  sameT(t, base.treatments.find((x) => x.id === t.id))
    ? t.id
    : [
        t.id,
        t.name,
        t.formalName,
        t.purpose,
        t.risks,
        t.visits,
        KIND_CODE.indexOf(t.kind),
        t.unit === "1回" ? 1 : 0,
        t.confirmed ? 1 : 0,
      ];

export function packQuote(q: Quote, base: Settings): string {
  const T: Ref<TFull>[] = [];
  const tKey: string[] = [];
  const tIndex = (t: QuoteTreatment) => {
    const key = JSON.stringify(packT(t, base));
    let i = tKey.indexOf(key);
    if (i < 0) {
      i = tKey.push(key) - 1;
      T.push(packT(t, base));
    }
    return i;
  };
  const F: Ref<[string, string, string]>[] = [];
  const fKey: string[] = [];
  const fIndex = (f: Finding | undefined) => {
    if (!f) return -1;
    const b = base.findings.find((x) => x.id === f.id);
    const ref: Ref<[string, string, string]> =
      b && b.name === f.name && b.note === f.note ? f.id : [f.id, f.name, f.note];
    const key = JSON.stringify(ref);
    let i = fKey.indexOf(key);
    if (i < 0) {
      i = fKey.push(key) - 1;
      F.push(ref);
    }
    return i;
  };
  const baseSeg = base.segments.find((s) => s.id === q.segment.id);
  const packed = {
    v: 2,
    g: baseSeg?.name === q.segment.name ? q.segment.id : [q.segment.id, q.segment.name],
    i: q.lines.map((l) => {
      const ti = tIndex(l.t);
      const bv = base.treatments
        .find((x) => x.id === l.t.id)
        ?.variants.find((x) => x.id === l.variantId);
      const variant =
        typeof T[ti] === "string" && bv?.name === l.variantName
          ? l.variantId
          : [l.variantId, l.variantName];
      const row: unknown[] = [ti, variant, l.teeth, l.qty, l.phase, l.unitPrice, fIndex(l.finding)];
      if (l.reason) row.push(l.reason);
      return row;
    }),
    T,
    F,
    m: q.months,
    n: q.visits,
    t: q.note,
    c: q.createdAt,
    p: (q.payment.lumpSum ? 1 : 0) | (q.payment.perPhase ? 2 : 0) | (q.payment.installment ? 4 : 0),
    M: q.maintenance
      ? [packT(q.maintenance.t, base), q.maintenance.price, q.maintenance.timesPerYear]
      : undefined,
  };
  return LZString.compressToEncodedURIComponent(JSON.stringify(packed));
}

const isStr = (x: unknown): x is string => typeof x === "string";
const int = (x: unknown, min: number, max: number): number | undefined =>
  typeof x === "number" && Number.isInteger(x) && x >= min && x <= max ? x : undefined;

function unpackT(ref: unknown, base: Settings): QuoteTreatment | null {
  if (isStr(ref)) {
    const b = base.treatments.find((x) => x.id === ref);
    return b ? snapshot(b) : null;
  }
  if (!Array.isArray(ref) || !ref.slice(0, 6).every(isStr)) return null;
  const kind = KIND_CODE[int(ref[6], 0, 2) ?? -1];
  if (!kind || !ref[1]) return null;
  return {
    id: ref[0].slice(0, 40),
    name: ref[1].slice(0, 30),
    formalName: ref[2].slice(0, 40),
    purpose: ref[3].slice(0, 200),
    risks: ref[4].slice(0, 300),
    visits: ref[5].slice(0, 40),
    kind,
    unit: ref[7] === 1 ? "1回" : "一式",
    confirmed: ref[8] === 1,
  };
}

// 壊れたデータは null。おかしな行は捨てる。
export function unpackQuote(hash: string, base: Settings): Quote | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash.replace(/^#/, ""));
    if (!json) return null;
    const p = JSON.parse(json) as Record<string, unknown>;
    if (p.v !== 2 || !Array.isArray(p.i) || !Array.isArray(p.T)) return null;

    let segment: Segment | undefined;
    if (isStr(p.g)) segment = base.segments.find((s) => s.id === p.g);
    else if (Array.isArray(p.g) && isStr(p.g[0]) && isStr(p.g[1]))
      segment = { id: p.g[0].slice(0, 40), name: p.g[1].slice(0, 20) };
    if (!segment) return null;

    const T = p.T.map((r) => unpackT(r, base));
    const F = (Array.isArray(p.F) ? p.F : []).map((r): Finding | undefined => {
      if (isStr(r)) return base.findings.find((f) => f.id === r);
      if (Array.isArray(r) && r.slice(0, 3).every(isStr))
        return { id: r[0].slice(0, 40), name: r[1].slice(0, 30), note: r[2].slice(0, 120) };
      return undefined;
    });

    const lines: QuoteLine[] = [];
    for (const row of p.i) {
      if (!Array.isArray(row)) continue;
      const t = T[int(row[0], 0, T.length - 1) ?? -1];
      const phase = int(row[4], 1, 3) as Phase | undefined;
      const unitPrice = int(row[5], 0, 99_999_999);
      if (!t || !phase || unitPrice === undefined) continue;

      let variantId = "";
      let variantName = "";
      if (isStr(row[1])) {
        variantId = row[1];
        variantName =
          base.treatments.find((x) => x.id === t.id)?.variants.find((x) => x.id === variantId)
            ?.name ?? "";
      } else if (Array.isArray(row[1]) && isStr(row[1][0]) && isStr(row[1][1])) {
        variantId = row[1][0].slice(0, 40);
        variantName = row[1][1].slice(0, 30);
      } else continue;

      const teeth =
        t.kind === "mouth" || !Array.isArray(row[2]) ? [] : sortTeeth(row[2].filter(isValidTooth));
      if (t.kind !== "mouth" && teeth.length === 0) continue;
      const qty = t.kind === "mouth" ? int(row[3], 1, 99) : 1;
      if (!qty) continue;

      lines.push({
        t,
        variantId,
        variantName,
        teeth,
        qty,
        phase,
        unitPrice,
        finding: F[int(row[6], 0, F.length - 1) ?? -1],
        reason: isStr(row[7]) ? row[7].slice(0, 80) : undefined,
      });
    }

    let maintenance: Quote["maintenance"];
    if (Array.isArray(p.M)) {
      const t = unpackT(p.M[0], base);
      const price = int(p.M[1], 0, 99_999_999);
      const timesPerYear = int(p.M[2], 1, 12);
      if (t && price !== undefined && timesPerYear) maintenance = { t, price, timesPerYear };
    }
    const bits = int(p.p, 0, 7) ?? 3;
    return {
      segment,
      lines,
      months: int(p.m, 1, 999),
      visits: int(p.n, 1, 999),
      note: isStr(p.t) ? p.t.slice(0, 300) : undefined,
      createdAt: isStr(p.c) ? p.c.slice(0, 10) : today(),
      payment: { lumpSum: !!(bits & 1), perPhase: !!(bits & 2), installment: !!(bits & 4) },
      maintenance,
    };
  } catch {
    return null;
  }
}
