import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { treatments } from "../data/treatments";
import type { Plan } from "../data/types";
import { decodePlan } from "./plan";
import { planUrl } from "./share";

// 料金マスターの全項目を入れた、長めの計画
const plan: Plan = {
  items: treatments.map((t, i) => ({
    treatmentId: t.id,
    qty: i + 1,
    phase: ((i % 3) + 1) as 1 | 2 | 3,
    priceOverride: i % 2 ? 123200 + i : undefined,
  })),
  months: 18,
  visits: 30,
  note: "右上の奥歯から始めます。途中で一度、計画を見直します。",
  createdAt: "2026-11-14",
};

describe("QRコード", () => {
  it("QRを読み取ると、同じ計画が開く", () => {
    const url = planUrl("https://example.good-smile.com", plan);
    // QRコードを画像にして、読み取り機（jsQR）で読む
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
    expect(decodePlan(new URL(read!.data).hash, treatments)).toEqual(plan);
  });

  it("リンクに氏名などを入れる場所がない（治療・数・段階・金額・期間・メモ・日付だけ）", () => {
    const hash = new URL(planUrl("https://example.com", plan)).hash;
    const back = decodePlan(hash, treatments)!;
    expect(Object.keys(back).sort()).toEqual(
      ["createdAt", "items", "months", "note", "visits"].sort(),
    );
  });
});
