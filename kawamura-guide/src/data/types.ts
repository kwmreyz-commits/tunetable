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

// ───────── 設定（医院ごとに画面から変えられる） ─────────

// 料金の区分（大人・子ども など）
export type Segment = { id: string; name: string };

// ドックでわかる「状態」。治療が必要な理由として見積もりに出る
export type Finding = { id: string; name: string; note: string };

// 治療の種類（かぶせ物のセラミック／ゴールド など）。値段は区分ごと
export type Variant = {
  id: string;
  name: string; // 種類が1つだけなら空でよい
  prices: Record<string, number>; // 区分ID → 税込・円。無い区分は先頭の区分と同じ値段
};

// 値段のつけ方
//  perTooth … 歯1本ごと（かぶせ物・インプラント など）
//  teethSet … 選んだ歯をまとめて一式（入れ歯・ブリッジ など）
//  mouth    … お口全体（歯を選ばない。歯ぐきの治療・矯正 など）
export type TreatmentKind = "perTooth" | "teethSet" | "mouth";

export type Treatment = {
  id: string;
  name: string; // やさしい名前
  formalName: string; // 正式名（なければ空）
  purpose: string; // 何のためか
  risks: string; // 主なリスク・注意点（必須。空なら公開不可）
  visits: string; // 通院の目安（なければ空）
  kind: TreatmentKind;
  unit: "1回" | "一式"; // mouth のときだけ使う
  variants: Variant[]; // 1つ以上
  enabled: boolean; // この医院で扱うか
  confirmed: boolean; // 院長が確認済みか
};

export type Settings = {
  version: 1;
  segments: Segment[];
  findings: Finding[];
  treatments: Treatment[];
  payment: { lumpSum: boolean; perPhase: boolean; installment: boolean };
  maintenance: { treatmentId: string; timesPerYear: number };
};

// ───────── 計画（スタッフが作る。設定を参照する） ─────────

export type Phase = 1 | 2 | 3; // ①まず必要 ②早めに ③将来

export type PlanItem = {
  treatmentId: string;
  variantId: string;
  teeth: number[]; // 歯の番号（FDI方式 11〜48、乳歯 51〜85）。mouth のときは空
  qty: number; // mouth のときの回数。それ以外は使わない
  phase: Phase;
  priceOverride?: number; // 1単位あたりの金額を手で直したとき
  findingId?: string; // ドックでわかった状態
  reason?: string; // ひとこと（個人名は書かない運用）
};

export type Plan = {
  segmentId: string;
  items: PlanItem[];
  months?: number;
  visits?: number;
  note?: string; // 個人名は書かない運用
  createdAt: string;
};

// ───────── 見積もり（患者さんに渡す。設定が無くても読める完成形） ─────────

export type QuoteTreatment = Pick<
  Treatment,
  "id" | "name" | "formalName" | "purpose" | "risks" | "visits" | "kind" | "unit" | "confirmed"
>;

export type QuoteLine = {
  t: QuoteTreatment;
  variantId: string;
  variantName: string;
  teeth: number[];
  qty: number;
  phase: Phase;
  unitPrice: number; // 税込・円
  finding?: Finding;
  reason?: string;
};

export type Quote = {
  segment: Segment;
  lines: QuoteLine[];
  months?: number;
  visits?: number;
  note?: string;
  createdAt: string;
  payment: Settings["payment"];
  maintenance?: { t: QuoteTreatment; price: number; timesPerYear: number };
};
