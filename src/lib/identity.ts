/**
 * 匿名IDから決定的にニックネームと色を導出する。
 *
 * 参加者に登録も入力も求めないという方針は変えたくないが、
 * テレビに「誰が入れた曲か」が出ると場が盛り上がるし、
 * 自分のリクエストをキューの中から見つけられるようになる。
 * localStorageのUUIDから毎回同じ名前が出るようにすることで、
 * DBに列を足さずに「顔」を作る。
 */

const ANIMALS = [
  { emoji: "🐰", name: "ウサギ" },
  { emoji: "🐱", name: "ネコ" },
  { emoji: "🐶", name: "イヌ" },
  { emoji: "🦊", name: "キツネ" },
  { emoji: "🐻", name: "クマ" },
  { emoji: "🐼", name: "パンダ" },
  { emoji: "🐨", name: "コアラ" },
  { emoji: "🐯", name: "トラ" },
  { emoji: "🦁", name: "ライオン" },
  { emoji: "🐮", name: "ウシ" },
  { emoji: "🐷", name: "ブタ" },
  { emoji: "🐸", name: "カエル" },
  { emoji: "🐵", name: "サル" },
  { emoji: "🐔", name: "ニワトリ" },
  { emoji: "🐧", name: "ペンギン" },
  { emoji: "🦉", name: "フクロウ" },
  { emoji: "🦅", name: "ワシ" },
  { emoji: "🦇", name: "コウモリ" },
  { emoji: "🐺", name: "オオカミ" },
  { emoji: "🐗", name: "イノシシ" },
  { emoji: "🐴", name: "ウマ" },
  { emoji: "🦄", name: "ユニコーン" },
  { emoji: "🐝", name: "ハチ" },
  { emoji: "🦋", name: "チョウ" },
  { emoji: "🐙", name: "タコ" },
  { emoji: "🦑", name: "イカ" },
  { emoji: "🦀", name: "カニ" },
  { emoji: "🐬", name: "イルカ" },
  { emoji: "🐳", name: "クジラ" },
  { emoji: "🦈", name: "サメ" },
  { emoji: "🦖", name: "キョウリュウ" },
  { emoji: "🦔", name: "ハリネズミ" },
] as const;

const MODIFIERS = [
  "おどる",
  "ねむい",
  "きまぐれ",
  "はしゃぐ",
  "ごきげん",
  "しずかな",
  "あわてん",
  "ほろよい",
  "まじめな",
  "やさしい",
  "ひかる",
  "うたう",
] as const;

export interface Pseudonym {
  /** 絵文字。テレビ表示でひと目で区別できるようにする */
  emoji: string;
  /** 「おどるウサギ」形式の表示名 */
  name: string;
  /** アバターの背景に使うHSLの色 */
  color: string;
}

/** FNV-1a。暗号強度は不要。安定したハッシュであることだけが要件 */
function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pseudonymFor(anonymousId: string): Pseudonym {
  if (!anonymousId) {
    return { emoji: "🎵", name: "ゲスト", color: "hsl(270 45% 42%)" };
  }
  const seed = hash32(anonymousId);
  const animal = ANIMALS[seed % ANIMALS.length];
  const modifier = MODIFIERS[Math.floor(seed / ANIMALS.length) % MODIFIERS.length];
  // 紫〜ピンク〜青の範囲に寄せて、ダークテーマから浮かないようにする
  const hue = 220 + (seed % 140);
  return {
    emoji: animal.emoji,
    name: `${modifier}${animal.name}`,
    color: `hsl(${hue} 55% 45%)`,
  };
}
