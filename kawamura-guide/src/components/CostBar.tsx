import type { Cost } from "../data/types";
import { yen } from "../lib/format";

// 金額の幅を横棒で見せる。色だけに頼らず、必ず数字を添える。
export function CostBar({ cost, scaleMax }: { cost: Cost; scaleMax: number }) {
  if (cost.kind === "text") return null;
  const pct = (n: number) => `${Math.min(100, (n / scaleMax) * 100)}%`;
  const open = cost.max === undefined; // 「◯円〜」
  const max = cost.max ?? cost.min;
  return (
    <div aria-hidden="true" className="mt-2">
      <div className="relative h-4 rounded-full border border-line bg-paper">
        {/* 0円〜最低額：うすい色 */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-main-soft"
          style={{ width: pct(cost.min) }}
        />
        {/* 最低額〜最高額：濃い色 */}
        <div
          className="absolute inset-y-0 rounded-full bg-main"
          style={{
            left: pct(cost.min),
            width: open ? "0.6rem" : `calc(${pct(max)} - ${pct(cost.min)})`,
            marginLeft: open ? "-0.3rem" : 0,
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[0.9rem] text-sub">
        <span>0円</span>
        <span>{yen(scaleMax)}</span>
      </div>
    </div>
  );
}
