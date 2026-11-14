import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import type { Plan, Settings } from "../data/types";
import { packQuote, resolve, summarize, toPlan, unpackQuote, yen } from "./plan";
import { builtin, normalizeSettings, priceFor } from "./settings";
import { quoteUrl } from "./share";

const plan: Plan = {
  segmentId: "adult",
  items: [
    { treatmentId: "plaque-control", variantId: "std", teeth: [], qty: 2, phase: 1, findingId: "plaque" },
    { treatmentId: "root-canal", variantId: "back", teeth: [16], qty: 1, phase: 1, findingId: "root", reason: "レントゲンで根の先に影" },
    { treatmentId: "crown", variantId: "ceramic", teeth: [16, 17], qty: 1, phase: 2, findingId: "old-work" },
    { treatmentId: "denture", variantId: "partial", teeth: [35, 36, 37], qty: 1, phase: 2, findingId: "missing" },
    { treatmentId: "implant", variantId: "std", teeth: [46], qty: 1, phase: 3, priceOverride: 440000 },
  ],
  months: 8,
  visits: 16,
  note: "右上から始めます",
  createdAt: "2026-11-14",
};

describe("見積もりの金額", () => {
  const q = resolve(plan, builtin);
  const s = summarize(q);

  it("項目の合計 ＝ 段階の合計 ＝ 全体の合計", () => {
    expect(s.rows.reduce((a, r) => a + r.amount, 0)).toBe(s.total);
    expect(s.byPhase[1] + s.byPhase[2] + s.byPhase[3]).toBe(s.total);
    for (const ph of [1, 2, 3] as const)
      expect(
        s.rows.filter((r) => r.line.phase === ph).reduce((a, r) => a + r.amount, 0),
      ).toBe(s.byPhase[ph]);
    for (const r of s.rows) expect(r.amount).toBe(r.line.unitPrice * r.count);
  });

  it("手で計算した金額と合う", () => {
    // ① 歯みがき 5,500×2回 ＋ 根の治療（奥歯）132,000×1本
    expect(s.byPhase[1]).toBe(11000 + 132000);
    // ② かぶせ物 165,000×2本 ＋ 入れ歯（3本ぶんをまとめて一式）330,000×1
    expect(s.byPhase[2]).toBe(330000 + 330000);
    // ③ インプラント：手で直した 440,000×1本
    expect(s.byPhase[3]).toBe(440000);
    expect(yen(s.total)).toBe("1,243,000円");
  });

  it("数え方：歯1本ごと／まとめて一式／お口全体", () => {
    expect(s.rows.map((r) => r.count)).toEqual([2, 1, 2, 1, 1]);
  });

  it("子どもの値段。入っていなければ大人と同じ", () => {
    const child = summarize(resolve({ ...plan, segmentId: "child" }, builtin));
    expect(child.rows[0].line.unitPrice).toBe(3300);
    expect(child.rows[2].line.unitPrice).toBe(165000);
    const v = builtin.treatments[0].variants[0];
    expect(priceFor(v, "child", builtin.segments)).toBe(3300);
    expect(priceFor(v, "nobody", builtin.segments)).toBe(5500);
  });

  it("理由（ドックでわかったこと）が見積もりに入る", () => {
    expect(q.lines[1].finding?.name).toBe("歯の根の病気");
    expect(q.lines[1].reason).toBe("レントゲンで根の先に影");
  });
});

// 医院が画面から作り変えた設定（アプリに入っている初期設定とちがう）
const custom: Settings = normalizeSettings({
  ...builtin,
  segments: [...builtin.segments, { id: "senior", name: "シニア" }],
  findings: [...builtin.findings, { id: "f-new", name: "知覚過敏", note: "冷たいものがしみる状態です。" }],
  treatments: [
    ...builtin.treatments.map((t) =>
      t.id === "crown" ? { ...t, risks: "この医院で書き直した注意点。", confirmed: true } : t,
    ),
    {
      id: "t-white", name: "ホワイトニング", formalName: "", purpose: "歯を白くします。",
      risks: "しみることがあります。", visits: "2回", kind: "mouth", unit: "一式",
      variants: [{ id: "v1", name: "ホーム", prices: { adult: 33000, senior: 30000 } }],
      enabled: true, confirmed: true,
    },
  ],
})!;

describe("URLへの出し入れ", () => {
  it("入れて出すと同じ見積もりになる", () => {
    const q = resolve(plan, builtin);
    expect(unpackQuote(packQuote(q, builtin), builtin)).toEqual(q);
    expect(unpackQuote("#" + packQuote(q, builtin), builtin)).toEqual(q);
  });

  it("初期設定のままなら短い", () => {
    const h = packQuote(resolve(plan, builtin), builtin);
    expect(h).toMatch(/^[A-Za-z0-9+\-$]+$/);
    expect(h.length).toBeLessThan(500);
  });

  it("医院が作り変えた項目・値段・区分も、設定の無いスマホで同じように開く", () => {
    const p: Plan = {
      ...plan,
      segmentId: "senior",
      items: [
        ...plan.items,
        { treatmentId: "t-white", variantId: "v1", teeth: [], qty: 1, phase: 3, findingId: "f-new" },
      ],
    };
    const q = resolve(p, custom);
    // 患者さんのスマホには初期設定（builtin）しか無い
    const back = unpackQuote(packQuote(q, builtin), builtin);
    expect(back).toEqual(q);
    expect(back!.segment.name).toBe("シニア");
    expect(back!.lines.at(-1)!.t.name).toBe("ホワイトニング");
    expect(back!.lines.at(-1)!.unitPrice).toBe(30000);
    expect(back!.lines[2].t.risks).toBe("この医院で書き直した注意点。");
    expect(summarize(back!).total).toBe(summarize(q).total);
  });

  it("壊れたデータは null、おかしな行は捨てる", () => {
    expect(unpackQuote("", builtin)).toBeNull();
    expect(unpackQuote("#abc", builtin)).toBeNull();
    const odd: Plan = {
      ...plan,
      items: [...plan.items, { treatmentId: "nothing", variantId: "x", teeth: [99], qty: 1, phase: 1 }],
    };
    expect(resolve(odd, builtin).lines.length).toBe(5);
  });

  it("「修正する」で計画に戻せる", () => {
    const q = resolve(plan, builtin);
    const back = toPlan(q, builtin);
    expect(resolve(back, builtin)).toEqual(q);
    expect(back.items[4].priceOverride).toBe(440000);
    expect(back.items[0].priceOverride).toBeUndefined();
  });
});

describe("QRコード", () => {
  it("QRを読み取ると、同じ見積もりが開く（作り変えた設定でも）", () => {
    const q = resolve({ ...plan, segmentId: "senior" }, custom);
    const url = quoteUrl("https://example.good-smile.com", q, builtin);
    const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
    const scale = 4;
    const quiet = 4;
    const size = (modules.size + quiet * 2) * scale;
    const px = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++)
        if (modules.get(y, x))
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const o = (((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx) * 4;
              px[o] = px[o + 1] = px[o + 2] = 0;
            }
    const read = jsQR(px, size, size);
    expect(read?.data).toBe(url);
    expect(unpackQuote(new URL(read!.data).hash, builtin)).toEqual(q);
  });
});
