import type { Clinic, ModelCase, Stage } from "../data/types";

// 公開版かどうか（vite build --mode public）
export const isPublicBuild = () => import.meta.env?.MODE === "public";

// 公開版では、院長が確認済みのモデルケースだけを出す
export function visibleModelCases(
  cases: ModelCase[],
  publicBuild: boolean,
): ModelCase[] {
  return publicBuild ? cases.filter((c) => c.confirmed) : cases;
}

// 「サンプル金額です」の帯を出すかどうか
export function hasSample(stages: Stage[], shownCases: ModelCase[]): boolean {
  return (
    stages.some((s) => !s.confirmed) || shownCases.some((c) => !c.confirmed)
  );
}

// 公開してはいけない理由の一覧。空なら公開できる。
export function publicProblems(
  stages: Stage[],
  cases: ModelCase[],
  clinic: Clinic,
): string[] {
  const out: string[] = [];
  for (const s of stages) {
    if (!s.confirmed) out.push(`道のり「${s.name}」が未確認です`);
    if (!s.risks.trim()) out.push(`道のり「${s.name}」の注意点が空です`);
    if (s.cost.kind === "amount") {
      const { min, max } = s.cost;
      if (!(min > 0) || (max !== undefined && max < min))
        out.push(`道のり「${s.name}」の金額がおかしいです`);
    }
  }
  // 未確認のモデルケースは公開版に出ないので止めない。確認済みのものだけ調べる。
  for (const c of cases.filter((c) => c.confirmed)) {
    if (!c.risks.trim()) out.push(`モデルケース「${c.title}」の注意点が空です`);
    if (!(c.total > 0)) out.push(`モデルケース「${c.title}」の金額がおかしいです`);
  }
  if (!clinic.tel.trim()) out.push("電話番号が空です");
  if (!clinic.lineUrl.trim()) out.push("LINE予約のURLが空です");
  if (clinic.hours.length === 0) out.push("診療時間が空です");
  if (!clinic.closed.trim()) out.push("休診日が空です");
  if (!clinic.address.trim()) out.push("住所が空です");
  return out;
}
