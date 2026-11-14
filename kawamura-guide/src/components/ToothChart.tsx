import type { Phase } from "../data/types";
import { CHART, chartShapes, toothName, toothNo, type Dentition } from "../lib/teeth";

// 上の歯・下の歯の図。画面の左が患者さんの右（向かい合って見た向き）。
// 色だけに頼らないよう、選んだ歯は太いふち＋チェック、治療のある歯は ①②③ を添える。
export function ToothChart({
  dentition,
  selected = [],
  marks = {},
  onToggle,
  className = "",
}: {
  dentition: Dentition;
  selected?: number[];
  marks?: Record<number, Phase>; // 治療が入っている歯 → 段階
  onToggle?: (fdi: number) => void; // 無ければ見るだけの図
  className?: string;
}) {
  const c = CHART[dentition];
  const shapes = chartShapes(dentition);
  const mid = (c.upperCy + c.lowerCy) / 2;
  const fill: Record<Phase, string> = {
    1: "var(--color-main)",
    2: "var(--color-main-mid)",
    3: "var(--color-main-soft)",
  };
  return (
    <svg
      viewBox={`0 0 ${c.width} ${c.height}`}
      className={`block h-auto w-full select-none ${className}`}
      role={onToggle ? "group" : "img"}
      aria-label={onToggle ? "歯をえらぶ図" : "治療する歯の図"}
    >
      <g className="fill-sub text-[17px]" textAnchor="middle" aria-hidden="true">
        <text x={c.cx} y={c.upperCy - c.ry * 0.42} className="text-[20px] font-bold">
          上の歯
        </text>
        <text x={c.cx} y={c.lowerCy + c.ry * 0.5} className="text-[20px] font-bold">
          下の歯
        </text>
        <text x={c.cx - c.rx * 0.55} y={mid + 6}>
          ← 右
        </text>
        <text x={c.cx + c.rx * 0.55} y={mid + 6}>
          左 →
        </text>
        <text x={c.cx} y={mid + 5} className="text-[13px]">
          （ご本人から見て）
        </text>
      </g>

      {shapes.map((t) => {
        const on = selected.includes(t.fdi);
        const mark = marks[t.fdi];
        const dark = mark === 1 || mark === 2;
        const label = `${toothName(t.fdi)}${mark ? `、治療あり（段階${mark}）` : ""}`;
        return (
          <g
            key={t.fdi}
            role={onToggle ? "button" : undefined}
            tabIndex={onToggle ? 0 : undefined}
            aria-pressed={onToggle ? on : undefined}
            aria-label={onToggle ? label : undefined}
            onClick={onToggle && (() => onToggle(t.fdi))}
            onKeyDown={
              onToggle &&
              ((e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle(t.fdi);
                }
              })
            }
            className={onToggle ? "cursor-pointer outline-none [&:focus-visible>rect]:stroke-[5]" : ""}
          >
            <rect
              x={-t.w / 2}
              y={-t.h / 2}
              width={t.w}
              height={t.h}
              rx={Math.min(t.w, t.h) * 0.32}
              transform={`translate(${t.x} ${t.y}) rotate(${t.angle})`}
              fill={on ? "var(--color-pick)" : mark ? fill[mark] : "#fff"}
              stroke={on ? "var(--color-ink)" : mark ? "var(--color-main-dark)" : "var(--color-tooth-line)"}
              strokeWidth={on ? 3.5 : mark ? 2 : 1.5}
            />
            <text
              x={t.x}
              y={t.y + 6}
              textAnchor="middle"
              aria-hidden="true"
              className="pointer-events-none text-[17px] font-bold"
              fill={on ? "var(--color-ink)" : dark ? "#fff" : "var(--color-ink)"}
            >
              {on ? "✓" : toothNo(t.fdi)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
