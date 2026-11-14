// 数字は打たずに ＋ − で変える（年配の方・iPadでも押しやすい大きさ）
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  unit,
  label,
  emptyText,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  unit: string;
  label: string;
  emptyText?: string; // 値なし（未定）を許すときの表示
}) {
  const btn =
    "h-12 w-12 shrink-0 rounded-xl border-2 border-main bg-card text-[1.4rem] font-bold leading-none text-main-dark disabled:border-line disabled:text-line";
  const dec = () => {
    if (value === undefined) return;
    if (value <= min) return emptyText ? onChange(undefined) : undefined;
    onChange(value - 1);
  };
  const inc = () => onChange(value === undefined ? min : Math.min(max, value + 1));
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={dec}
        disabled={value === undefined || (value <= min && !emptyText)}
        aria-label={`${label}を減らす`}
      >
        −
      </button>
      <span className="min-w-16 text-center font-bold" aria-live="polite">
        {value === undefined ? emptyText : `${value}${unit}`}
      </span>
      <button
        type="button"
        className={btn}
        onClick={inc}
        disabled={value !== undefined && value >= max}
        aria-label={`${label}を増やす`}
      >
        ＋
      </button>
    </div>
  );
}
