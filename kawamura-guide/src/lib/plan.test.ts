import { describe, expect, it } from "vitest";
import { treatments } from "../data/treatments";
import type { Plan } from "../data/types";
import { add, decodePlan, encodePlan, moneyText, summarize, ZERO } from "./plan";

const plan: Plan = {
  items: [
    { treatmentId: "plaque-control", qty: 2, phase: 1 },
    { treatmentId: "perio", qty: 4, phase: 1, priceOverride: 22000 },
    { treatmentId: "root-canal", qty: 2, phase: 1 },
    { treatmentId: "crown", qty: 3, phase: 2, priceOverride: 165000 },
    { treatmentId: "implant", qty: 1, phase: 3 },
  ],
  months: 8,
  visits: 16,
  note: "右上から始める",
  createdAt: "2026-11-14",
};

describe("計画の金額", () => {
  const s = summarize(plan, treatments);

  it("項目の合計 ＝ 段階の合計 ＝ 全体の合計", () => {
    const fromRows = s.rows.reduce((a, r) => add(a, r.amount), ZERO);
    const fromPhases = add(add(s.byPhase[1], s.byPhase[2]), s.byPhase[3]);
    expect(fromRows).toEqual(s.total);
    expect(fromPhases).toEqual(s.total);
    for (const ph of [1, 2, 3] as const) {
      const rows = s.rows.filter((r) => r.item.phase === ph);
      expect(rows.reduce((a, r) => add(a, r.amount), ZERO)).toEqual(s.byPhase[ph]);
    }
  });

  it("手で計算した金額と合う", () => {
    // ① 5,500×2〜11,000×2 ＋ 22,000×4 ＋ 55,000×2〜165,000×2
    expect(s.byPhase[1]).toEqual({ min: 209000, max: 440000 });
    expect(s.byPhase[2]).toEqual({ min: 495000, max: 495000 });
    expect(s.byPhase[3]).toEqual({ min: 440000, max: 660000 });
    expect(s.total).toEqual({ min: 1144000, max: 1595000 });
  });

  it("金額を上書きすると幅ではなく1つの金額になる", () => {
    expect(moneyText(s.byPhase[2])).toBe("495,000円");
    expect(moneyText(s.total)).toBe("1,144,000〜1,595,000円");
  });
});

describe("URLへの出し入れ", () => {
  it("入れて出すと同じ計画になる", () => {
    expect(decodePlan(encodePlan(plan), treatments)).toEqual(plan);
    expect(decodePlan("#" + encodePlan(plan), treatments)).toEqual(plan);
  });
  it("URLに使える文字だけで、短い", () => {
    const h = encodePlan(plan);
    expect(h).toMatch(/^[A-Za-z0-9+\-$]+$/);
    expect(h.length).toBeLessThan(400);
  });
  it("壊れたデータは null", () => {
    expect(decodePlan("", treatments)).toBeNull();
    expect(decodePlan("#abc", treatments)).toBeNull();
  });
  it("知らない治療やおかしな数は捨てる", () => {
    const odd = { ...plan, items: [...plan.items, { treatmentId: "x", qty: 1, phase: 1 as const }] };
    expect(decodePlan(encodePlan(odd), treatments)?.items.length).toBe(5);
  });
});
