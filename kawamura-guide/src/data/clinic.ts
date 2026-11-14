import type { Clinic } from "./types";

// 医院の基本情報。空欄があると公開ビルド（npm run build:public）は止まります。
export const clinic: Clinic = {
  name: "川村歯科天満橋診療所",
  tel: "06-6942-1596",
  lineUrl: "", // TODO: LINE予約のURL
  hours: [], // TODO: 例 ["月〜金 10:00〜18:00", "土 10:00〜13:00"]
  closed: "", // TODO: 休診日
  address: "", // TODO: 住所
};
