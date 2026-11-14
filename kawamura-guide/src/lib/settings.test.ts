import { describe, expect, it } from "vitest";
import { builtin, normalizeSettings } from "./settings";
import { ARCHES, chartShapes, teethLabel, toothName } from "./teeth";

describe("設定の読み込み", () => {
  it("初期設定が正しい形で入っている", () => {
    expect(builtin.segments.map((s) => s.name)).toEqual(["大人", "子ども"]);
    expect(builtin.treatments.length).toBeGreaterThanOrEqual(10);
    for (const t of builtin.treatments) {
      expect(t.variants.length).toBeGreaterThan(0);
      expect(t.risks).not.toBe("");
    }
  });
  it("書き出して読み込むと同じになる", () => {
    expect(normalizeSettings(JSON.parse(JSON.stringify(builtin)))).toEqual(builtin);
  });
  it("壊れたファイルは受け付けない", () => {
    expect(normalizeSettings(null)).toBeNull();
    expect(normalizeSettings({ segments: [] , treatments: [] })).toBeNull();
    expect(normalizeSettings("こんにちは")).toBeNull();
  });
  it("おかしな値は直して読み込む", () => {
    const s = normalizeSettings({
      segments: [{ id: "a", name: "大人" }, { id: "a", name: "子ども" }],
      treatments: [{ name: "新しい治療", kind: "???", variants: [{ prices: { a: -5, zzz: 100 } }] }],
    })!;
    expect(new Set(s.segments.map((x) => x.id)).size).toBe(2);
    expect(s.treatments[0].kind).toBe("perTooth");
    expect(s.treatments[0].variants[0].prices).toEqual({});
    expect(s.treatments[0].confirmed).toBe(false);
  });
});

describe("歯の図", () => {
  it("永久歯は上下16本ずつ、乳歯は10本ずつ", () => {
    expect(ARCHES.permanent.upper.length).toBe(16);
    expect(ARCHES.permanent.lower.length).toBe(16);
    expect(ARCHES.primary.upper.length).toBe(10);
    expect(chartShapes("permanent").length).toBe(32);
    expect(chartShapes("primary").length).toBe(20);
  });
  it("画面の左が患者さんの右", () => {
    const shapes = chartShapes("permanent");
    const x = (fdi: number) => shapes.find((s) => s.fdi === fdi)!.x;
    expect(x(18)).toBeLessThan(x(11));
    expect(x(11)).toBeLessThan(x(21));
    expect(x(48)).toBeLessThan(x(38));
  });
  it("歯が重ならない", () => {
    for (const d of ["permanent", "primary"] as const) {
      const shapes = chartShapes(d);
      for (let i = 1; i < shapes.length; i++) {
        if (i === shapes.length / 2) continue; // 上あごと下あごの境目
        const a = shapes[i - 1];
        const b = shapes[i];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual((a.w + b.w) / 2 - 0.01);
      }
    }
  });
  it("歯の呼び方", () => {
    expect(toothName(16)).toBe("右上6番（奥歯）");
    expect(toothName(75)).toBe("左下のE（乳歯の奥歯）");
    expect(teethLabel([17, 16, 36])).toBe("右上 6・7番、左下 6番");
    expect(teethLabel([54])).toBe("右上 乳歯D");
  });
});

import { parsePrice } from "../components/PriceInput";

describe("値段の入力", () => {
  it("区切りや全角があっても数字として読む", () => {
    expect(parsePrice("180000")).toBe(180000);
    expect(parsePrice("180,000")).toBe(180000);
    expect(parsePrice("１８万")).toBe(18);
    expect(parsePrice("１６５，０００円")).toBe(165000);
    expect(parsePrice("")).toBeUndefined();
    expect(parsePrice("abc")).toBeUndefined();
  });
});
