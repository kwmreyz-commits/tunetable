import { useCallback, useState } from "react";
import defaults from "../data/default-settings.json";
import type {
  Finding,
  Segment,
  Settings,
  Treatment,
  TreatmentKind,
  Variant,
} from "../data/types";

// 設定は、この端末（ブラウザ）の中だけに保存する。サーバーには送らない。
const KEY = "kawamura-guide.settings.v1";

export const newId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const str = (x: unknown, max: number) =>
  typeof x === "string" ? x.slice(0, max) : "";
const price = (x: unknown): number | undefined =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 99_999_999
    ? Math.round(x)
    : undefined;
const obj = (x: unknown): Record<string, unknown> | null =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
const KINDS: TreatmentKind[] = ["perTooth", "teethSet", "mouth"];

// 読み込んだ設定を、必ず正しい形に整える（壊れたファイルを読んでも落ちないように）
export function normalizeSettings(raw: unknown): Settings | null {
  const r = obj(raw);
  if (!r || !Array.isArray(r.segments) || !Array.isArray(r.treatments)) return null;

  const unique = (prefix: string) => {
    const seen = new Set<string>();
    return (x: unknown) => {
      let id = str(x, 40) || newId(prefix);
      while (seen.has(id)) id = newId(prefix);
      seen.add(id);
      return id;
    };
  };

  const segId = unique("seg");
  const segments: Segment[] = r.segments.flatMap((x) => {
    const o = obj(x);
    const name = o ? str(o.name, 20).trim() : "";
    return o && name ? [{ id: segId(o.id), name }] : [];
  });
  if (segments.length === 0) return null;

  const findId = unique("f");
  const findings: Finding[] = (Array.isArray(r.findings) ? r.findings : []).flatMap((x) => {
    const o = obj(x);
    const name = o ? str(o.name, 30).trim() : "";
    return o && name ? [{ id: findId(o.id), name, note: str(o.note, 120) }] : [];
  });

  const tId = unique("t");
  const treatments: Treatment[] = r.treatments.flatMap((x) => {
    const o = obj(x);
    if (!o) return [];
    const vId = unique("v");
    const variants: Variant[] = (Array.isArray(o.variants) ? o.variants : []).flatMap((v) => {
      const vo = obj(v);
      if (!vo) return [];
      const prices: Record<string, number> = {};
      const po = obj(vo.prices) ?? {};
      for (const s of segments) {
        const p = price(po[s.id]);
        if (p !== undefined) prices[s.id] = p;
      }
      return [{ id: vId(vo.id), name: str(vo.name, 30), prices }];
    });
    if (variants.length === 0) variants.push({ id: vId(""), name: "", prices: {} });
    const kind = KINDS.includes(o.kind as TreatmentKind) ? (o.kind as TreatmentKind) : "perTooth";
    return [
      {
        id: tId(o.id),
        name: str(o.name, 30),
        formalName: str(o.formalName, 40),
        purpose: str(o.purpose, 200),
        risks: str(o.risks, 300),
        visits: str(o.visits, 40),
        kind,
        unit: o.unit === "1回" ? "1回" : "一式",
        variants,
        enabled: o.enabled !== false,
        confirmed: o.confirmed === true,
      },
    ];
  });

  const pay = obj(r.payment) ?? {};
  const m = obj(r.maintenance) ?? {};
  const times = typeof m.timesPerYear === "number" ? Math.round(m.timesPerYear) : 2;
  return {
    version: 1,
    segments,
    findings,
    treatments,
    payment: {
      lumpSum: pay.lumpSum !== false,
      perPhase: pay.perPhase !== false,
      installment: pay.installment === true,
    },
    maintenance: {
      treatmentId: str(m.treatmentId, 40),
      timesPerYear: Math.min(12, Math.max(1, times)),
    },
  };
}

// アプリに最初から入っている設定（src/data/default-settings.json）
export const builtin: Settings = normalizeSettings(defaults)!;

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeSettings(JSON.parse(raw)) ?? builtin;
  } catch {
    /* 保存領域が使えないときは初期設定で動かす */
  }
  return builtin;
}

export function saveSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function resetSettings() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 何もしない */
  }
}

// 変えるたびに自動で保存する
export function useSettings(): [Settings, (next: Settings) => void] {
  const [s, set] = useState(loadSettings);
  const update = useCallback((next: Settings) => {
    set(next);
    saveSettings(next);
  }, []);
  return [s, update];
}

// その区分の値段。入っていなければ、先頭の区分（大人）と同じ
export function priceFor(v: Variant, segmentId: string, segments: Segment[]): number {
  return v.prices[segmentId] ?? v.prices[segments[0]?.id ?? ""] ?? 0;
}
