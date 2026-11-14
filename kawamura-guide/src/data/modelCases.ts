import type { ModelCase } from "./types";

// 費用の例（モデルケース）。
// ★ 金額・内容はすべて仮です。院長が決めたら書き換えて confirmed: true にしてください。
// confirmed: false のものは、公開版（build:public）には出ません。
export const modelCases: ModelCase[] = [
  {
    id: "case-a",
    title: "例A（仮）：歯ぐきの治療が中心の方",
    summary: "歯みがきの練習と、歯ぐきの治療を行う場合。",
    total: 100000,
    months: "約3か月",
    visits: "約6回",
    risks: "（院長確認待ち）",
    confirmed: false,
  },
  {
    id: "case-b",
    title: "例B（仮）：数本の歯を治す方",
    summary: "歯の根の治療と、かぶせ物を数本行う場合。",
    total: 500000,
    months: "約6か月",
    visits: "約12回",
    risks: "（院長確認待ち）",
    confirmed: false,
  },
  {
    id: "case-c",
    title: "例C（仮）：お口全体を治す方",
    summary: "かみ合わせを含めて、お口全体の治療を行う場合。",
    total: 1500000,
    months: "約12か月",
    visits: "約24回",
    risks: "（院長確認待ち）",
    confirmed: false,
  },
];
