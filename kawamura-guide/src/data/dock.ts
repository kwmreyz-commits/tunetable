// デンタルドックの説明（道のりページの中心）。
// ★ 文面はすべて仮です。院長が確認したら confirmed: true にしてください。
//   false の間は「サンプル」の帯が出て、公開用ビルドは止まります。

export type DockIcon = "tooth" | "gum" | "bite" | "xray" | "search" | "cause" | "plan";

export const dock = {
  confirmed: false,

  lead: "お口の「人間ドック」です。",
  sub: "治療を始める前に、お口全体をくわしく調べます。",

  // なぜ必要か（3つの絵で）
  why: [
    {
      icon: "search" as DockIcon,
      title: "いまの状態を知る",
      text: "痛いところだけでなく、お口全体を調べます。",
    },
    {
      icon: "cause" as DockIcon,
      title: "原因をさがす",
      text: "原因が残ったままだと、治してもまた悪くなることがあります。",
    },
    {
      icon: "plan" as DockIcon,
      title: "計画を立てる",
      text: "結果をもとに、治療の計画と見積もりをお出しします。",
    },
  ],

  // 何を調べるか
  checks: [
    { icon: "tooth" as DockIcon, name: "歯", text: "むし歯、詰め物・かぶせ物の状態" },
    { icon: "gum" as DockIcon, name: "歯ぐき", text: "歯周病の進み具合" },
    { icon: "bite" as DockIcon, name: "かみ合わせ", text: "歯やあごにかかる力" },
    { icon: "xray" as DockIcon, name: "骨と歯の根", text: "レントゲンなどで、見えないところまで" },
  ],

  // 3回の流れ（時間は医院サイト掲載の確定情報）
  visits: [
    { no: 1, time: "約1時間", title: "検査", text: "お口全体を調べます。" },
    { no: 2, time: "約1時間半", title: "くわしい検査", text: "さらにくわしく調べます。" },
    { no: 3, time: "約1時間", title: "結果のご報告", text: "結果をお伝えし、計画と見積もりをご相談します。" },
  ],
  pace: "約1週間に1回",

  // 結果の例。画像を public/dock/ に置いて、ここに足す。
  // 例：{ src: "/dock/example-1.png", caption: "お口全体の検査結果" }
  // ★ 実際の患者さんのものは使わず、見本として作ったものを載せてください。
  resultTitle: "結果は、このような形でお渡しします",
  resultImages: [] as { src: string; caption: string }[],
};
