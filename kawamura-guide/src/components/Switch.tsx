// オン・オフの切り替え。色だけでなく、文字でも状態を見せる。
export function Switch({
  checked,
  onChange,
  label,
  onText = "オン",
  offText = "オフ",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  onText?: string;
  offText?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-full border-2 px-2 font-bold ${
        checked ? "border-main bg-main-soft text-main-dark" : "border-line bg-paper text-sub"
      }`}
    >
      <span
        className={`flex h-7 w-12 items-center rounded-full p-0.5 ${checked ? "justify-end bg-main" : "justify-start bg-line"}`}
      >
        <span className="h-6 w-6 rounded-full bg-white" />
      </span>
      <span className="pr-1">{checked ? onText : offText}</span>
    </button>
  );
}
