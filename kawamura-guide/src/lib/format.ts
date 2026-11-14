import type { Cost } from "../data/types";

export const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

// 例：「3,300円〜」「16,500〜33,000円」
export function costText(cost: Cost): string {
  if (cost.kind === "text") return cost.text;
  if (cost.max === undefined) return `${yen(cost.min)}〜`;
  if (cost.max === cost.min) return yen(cost.min);
  return `${cost.min.toLocaleString("ja-JP")}〜${yen(cost.max)}`;
}
