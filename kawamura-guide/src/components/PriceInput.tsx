// 値段の入力。「110,000」のように区切って見せ、数字だけ打てばよい。
// 押すと全部がえらばれるので、そのまま打てば入れ替わる。

// 打たれた文字から数字だけを取り出す（全角の数字も受け付ける）
export function parsePrice(text: string): number | undefined {
  const digits = text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, "")
    .slice(0, 8);
  return digits === "" ? undefined : Number(digits);
}

export function PriceInput({
  value,
  onChange,
  label,
  placeholder = "0",
  className = "",
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <span
      className={`flex h-12 items-center rounded-xl border-2 border-line bg-card px-2 focus-within:border-main ${className}`}
    >
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-right font-bold outline-none placeholder:font-normal placeholder:text-sub/70"
        value={value === undefined ? "" : value.toLocaleString("ja-JP")}
        onFocus={(e) => {
          const el = e.target;
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => onChange(parsePrice(e.target.value))}
      />
      <span className="pl-1 text-sub">円</span>
    </span>
  );
}
