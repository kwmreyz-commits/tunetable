// 歯の番号は国際的な FDI 方式（2けた）。
//  十の位：1=右上 2=左上 3=左下 4=右下（乳歯は 5=右上 6=左上 7=左下 8=右下）
//  一の位：前から数えた番号（永久歯 1〜8、乳歯 1〜5 → A〜E）
// 図は「向かい合って見た向き」。画面の左が患者さんの右。

export type Dentition = "permanent" | "primary";

const range = (from: number, to: number) =>
  Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + (to > from ? i : -i));

export const ARCHES: Record<Dentition, { upper: number[]; lower: number[] }> = {
  permanent: {
    upper: [...range(18, 11), ...range(21, 28)],
    lower: [...range(48, 41), ...range(31, 38)],
  },
  primary: {
    upper: [...range(55, 51), ...range(61, 65)],
    lower: [...range(85, 81), ...range(71, 75)],
  },
};

const ALL = new Set(
  Object.values(ARCHES).flatMap((a) => [...a.upper, ...a.lower]),
);
// 図に出てくる順（右上→左上→右下→左下）
const ORDER = [
  ...ARCHES.permanent.upper,
  ...ARCHES.primary.upper,
  ...ARCHES.permanent.lower,
  ...ARCHES.primary.lower,
];

export const isValidTooth = (n: unknown): n is number =>
  typeof n === "number" && ALL.has(n);
export const isPrimary = (fdi: number) => fdi >= 50;
export const sortTeeth = (teeth: number[]) =>
  [...new Set(teeth)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const quadrant = (fdi: number) => ((Math.floor(fdi / 10) - 1) % 4) + 1; // 1〜4
const QUAD_NAME = ["", "右上", "左上", "左下", "右下"];
export const quadName = (fdi: number) => QUAD_NAME[quadrant(fdi)];

// 図の中に書く番号（永久歯 1〜8、乳歯 A〜E）
export const toothNo = (fdi: number) =>
  isPrimary(fdi) ? "ABCDE"[(fdi % 10) - 1] : String(fdi % 10);

const KIND_PERMANENT = ["", "前歯", "前歯", "糸切り歯", "小さい奥歯", "小さい奥歯", "奥歯", "奥歯", "親知らず"];
const KIND_PRIMARY = ["", "前歯", "前歯", "糸切り歯", "奥歯", "奥歯"];
export const toothKind = (fdi: number) =>
  isPrimary(fdi) ? `乳歯の${KIND_PRIMARY[fdi % 10]}` : KIND_PERMANENT[fdi % 10];

// 例：「右上6番（奥歯）」「右上のD（乳歯の奥歯）」
export const toothName = (fdi: number) =>
  isPrimary(fdi)
    ? `${quadName(fdi)}の${toothNo(fdi)}（${toothKind(fdi)}）`
    : `${quadName(fdi)}${toothNo(fdi)}番（${toothKind(fdi)}）`;

// 何本かをまとめて。例：「右上 6・7番、左下 6番」「右上 乳歯D」
export function teethLabel(teeth: number[]): string {
  const groups = new Map<string, string[]>();
  for (const t of sortTeeth(teeth)) {
    const key = `${quadName(t)}${isPrimary(t) ? " 乳歯" : ""}`;
    groups.set(key, [...(groups.get(key) ?? []), toothNo(t)]);
  }
  return [...groups]
    .map(([k, list]) => [k, [...list].sort()] as const)
    .map(([k, nos]) => (k.endsWith("乳歯") ? `${k}${nos.join("・")}` : `${k} ${nos.join("・")}番`))
    .join("、");
}

// ───────── 図の形（上あご・下あごを、歯ならびのアーチにならべる） ─────────

export type ToothShape = {
  fdi: number;
  x: number;
  y: number;
  angle: number; // 度
  w: number; // 歯ならびに沿った幅
  h: number; // 厚み
};

// 歯の幅の比（押しやすいよう、実物より前歯を少し大きめに）
const WIDTH: Record<Dentition, number[]> = {
  permanent: [0, 8, 7.5, 7.5, 7.5, 7.5, 9.5, 9.5, 9],
  primary: [0, 7, 6.5, 7, 8, 9],
};
const DEPTH: Record<Dentition, number[]> = {
  permanent: [0, 30, 30, 36, 40, 40, 46, 46, 42],
  primary: [0, 30, 30, 34, 40, 44],
};

export const CHART: Record<
  Dentition,
  { width: number; height: number; cx: number; rx: number; ry: number; upperCy: number; lowerCy: number }
> = {
  permanent: { width: 500, height: 560, cx: 250, rx: 196, ry: 228, upperCy: 256, lowerCy: 304 },
  primary: { width: 500, height: 440, cx: 250, rx: 150, ry: 164, upperCy: 196, lowerCy: 244 },
};

function arch(teeth: number[], d: Dentition, upper: boolean): ToothShape[] {
  const { cx, rx, ry, upperCy, lowerCy } = CHART[d];
  const cy = upper ? upperCy : lowerCy;
  const N = 720;
  // 半分のだ円を左から右へたどる（上あごは上を、下あごは下を通る）
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = Math.PI - (Math.PI * i) / N;
    return { x: cx + rx * Math.cos(t), y: cy + (upper ? -1 : 1) * ry * Math.sin(t) };
  });
  const cum = [0];
  for (let i = 1; i <= N; i++)
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[N];
  const widths = teeth.map((f) => WIDTH[d][f % 10]);
  const sum = widths.reduce((a, b) => a + b, 0);

  let before = 0;
  return teeth.map((fdi, k) => {
    const w = (widths[k] / sum) * total;
    const at = before + w / 2;
    before += w;
    let i = cum.findIndex((c) => c >= at);
    if (i < 1) i = 1;
    const a = pts[i - 1];
    const b = pts[i];
    const f = (at - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return {
      fdi,
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      w: w * 0.9,
      h: DEPTH[d][fdi % 10],
    };
  });
}

export const chartShapes = (d: Dentition): ToothShape[] => [
  ...arch(ARCHES[d].upper, d, true),
  ...arch(ARCHES[d].lower, d, false),
];
