// 費用の見せ方
export type Cost =
  // 金額（税込・円）。max が無いときは「◯円〜」
  | { kind: "amount"; min: number; max?: number; label: string }
  // 金額を出さず、言葉で案内する
  | { kind: "text"; text: string };

// 道のりの1段階
export type Stage = {
  id: string;
  no: 1 | 2 | 3 | 4;
  name: string;
  what: string; // 何をするか（やさしい言葉で2〜3行）
  visits: string; // 通院回数
  time?: string; // 1回の時間（通院とまとめて書くときは省く）
  cost: Cost;
  risks: string; // 主な注意点（必須。空なら公開不可）
  confirmed: boolean; // 院長が確認済みか
};

// 費用の例（モデルケース）
export type ModelCase = {
  id: string;
  title: string; // どんな状態の人か
  summary: string; // 治療のあらまし
  total: number; // 合計（税込・円）
  months: string; // 期間 例「約6か月」
  visits: string; // 通院 例「約12回」
  risks: string;
  confirmed: boolean;
};

export type Clinic = {
  name: string;
  tel: string;
  lineUrl: string;
  hours: string[]; // 診療時間（1行ずつ）
  closed: string; // 休診日
  address: string;
};

// ───────── Phase 2：料金マスターと計画 ─────────

// 料金マスターの1項目
export type Treatment = {
  id: string;
  name: string; // やさしい名前 例「歯の根の治療」
  formalName?: string; // 正式名 例「根管治療」
  purpose: string; // 何のためか（1〜2行）
  unit: "1本" | "1回" | "一式";
  priceMin: number; // 税込・円（1単位あたり）
  priceMax: number;
  visits?: string; // 例「2〜4回」
  risks: string; // 主なリスク・副作用（必須。空なら公開不可）
  confirmed: boolean; // 院長が確認済みか
};

export type Phase = 1 | 2 | 3; // ①まず必要 ②早めに ③将来

export type PlanItem = {
  treatmentId: string;
  qty: number;
  phase: Phase;
  priceOverride?: number; // 1単位あたりの金額（税込・円）。入れると幅ではなく1つの金額になる
};

export type Plan = {
  items: PlanItem[];
  months?: number;
  visits?: number;
  note?: string; // 個人名は書かない運用
  createdAt: string; // 例 "2026-11-14"
};
