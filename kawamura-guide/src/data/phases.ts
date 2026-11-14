import type { Phase } from "./types";

// 段階の名前と、その段階がある理由
export const phases: { no: Phase; mark: string; name: string; why: string }[] = [
  { no: 1, mark: "①", name: "まず必要", why: "痛みや進行を止めるために、最初に行う治療です。" },
  { no: 2, mark: "②", name: "早めに", why: "良い状態を長く保つために、早めに行いたい治療です。" },
  { no: 3, mark: "③", name: "将来", why: "急ぎではありません。時期を相談しながら考える治療です。" },
];
