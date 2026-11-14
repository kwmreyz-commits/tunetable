import QRCode from "qrcode";
import type { Plan } from "../data/types";
import { encodePlan } from "./plan";

// 持ち帰り用のリンク。計画の中身は # 以降に入る（サーバーには送られない）
export function planUrl(origin: string, plan: Plan): string {
  return `${origin}/plan#${encodePlan(plan)}`;
}

// QRコードを SVG の文字列にする
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
  });
}
