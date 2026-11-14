import type { Stage } from "./types";

// 道のりの4段階。金額を直すときはここだけ。
// 金額はすべて税込・円。
export const stages: Stage[] = [
  {
    id: "first-visit",
    no: 1,
    name: "初回相談・緊急治療",
    what: "お困りごとをうかがい、お口の状態を拝見します。痛みなど急ぎの症状があれば、先に応急の処置をします。",
    visits: "症状によって異なります",
    cost: { kind: "amount", min: 3300, label: "初回診療費" },
    risks:
      "応急の処置は、症状をやわらげるためのものです。原因に対する治療は、検査のあとにご相談します。処置の内容によって費用は変わります。",
    confirmed: true,
  },
  {
    id: "dental-dock",
    no: 2,
    name: "デンタルドック",
    what: "お口全体をくわしく調べる精密検査です。3回目に結果をご報告し、治療の計画と見積もりをご相談します。",
    visits: "3回（約1週間に1回）",
    time: "約1時間（2回目は約1時間半）",
    cost: { kind: "amount", min: 16500, max: 33000, label: "3回の合計" },
    risks:
      "検査の内容や費用は、お口の状態によって変わります。検査だけで治療が始まることはありません。",
    confirmed: true,
  },
  {
    id: "treatment",
    no: 3,
    name: "健康治療",
    what: "ドックで決めた計画に沿って、治療を進めます。内容・回数・費用は、お一人おひとり異なります。",
    visits: "計画によって異なります",
    cost: { kind: "text", text: "ドックのあとにお見積もり" },
    risks:
      "治療の結果には個人差があります。それぞれの治療の注意点は、計画のご相談のときに、内容ごとにご説明します。",
    confirmed: true,
  },
  {
    id: "maintenance",
    no: 4,
    name: "メンテナンス",
    what: "治療のあとの状態を保つための定期検診です。お口の中を確認し、必要なお手入れをします。",
    visits: "半年に一度",
    cost: { kind: "text", text: "医院でご案内します" },
    risks:
      "定期検診を受けていても、お口の状態が変わり、あらためて治療が必要になることがあります。",
    confirmed: true,
  },
];

// 道のりの中央に出す約束ごと
export const estimateNote =
  "見積もりはドックのあとに決まります。納得してから治療に進みます。";
