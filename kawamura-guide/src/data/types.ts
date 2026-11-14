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
