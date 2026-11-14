import { describe, expect, it } from "vitest";
import { clinic } from "../data/clinic";
import { stages } from "../data/journey";
import { modelCases } from "../data/modelCases";
import type { Clinic } from "../data/types";
import { costText } from "./format";
import { hasSample, publicProblems, visibleModelCases } from "./publicCheck";

const fullClinic: Clinic = {
  ...clinic,
  lineUrl: "https://example.com/line",
  hours: ["月〜金 10:00〜18:00"],
  closed: "日曜・祝日",
  address: "大阪市",
};

describe("金額の表示", () => {
  it("確定済みの金額がそのまま出る", () => {
    expect(costText(stages[0].cost)).toBe("3,300円〜");
    expect(costText(stages[1].cost)).toBe("16,500〜33,000円");
  });
  it("道のりは4段階", () => {
    expect(stages.map((s) => s.no)).toEqual([1, 2, 3, 4]);
  });
});

describe("公開の安全装置", () => {
  it("未確認のモデルケースは公開版に出ない", () => {
    const shown = visibleModelCases(modelCases, true);
    expect(shown.every((c) => c.confirmed)).toBe(true);
    expect(hasSample(stages, shown)).toBe(false);
  });
  it("院内確認用では未確認があると帯が出る", () => {
    const cases = [{ ...modelCases[0], confirmed: false }];
    expect(hasSample(stages, visibleModelCases(cases, false))).toBe(true);
  });
  it("医院情報がそろっていれば公開できる", () => {
    expect(publicProblems(stages, modelCases, fullClinic)).toEqual([]);
  });
  it("医院情報が空だと止まる", () => {
    const p = publicProblems(stages, modelCases, { ...fullClinic, address: "" });
    expect(p).toContain("住所が空です");
  });
  it("未確認の段階があると止まる", () => {
    const bad = [{ ...stages[0], confirmed: false }, ...stages.slice(1)];
    expect(publicProblems(bad, [], fullClinic).length).toBe(1);
  });
  it("注意点が空だと止まる", () => {
    const bad = [{ ...stages[0], risks: " " }, ...stages.slice(1)];
    expect(publicProblems(bad, [], fullClinic).length).toBe(1);
    const badCase = [{ ...modelCases[0], confirmed: true, risks: "" }];
    expect(publicProblems(stages, badCase, fullClinic).length).toBe(1);
  });
});
