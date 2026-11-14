import QRCode from "qrcode";
import type { Quote, Settings } from "../data/types";
import { packQuote } from "./plan";

// 持ち帰り用のリンク。見積もりの中身は # 以降に入る（サーバーには送られない）
export function quoteUrl(origin: string, quote: Quote, base: Settings): string {
  return `${origin}/plan#${packQuote(quote, base)}`;
}

// QRコードを SVG の文字列にする。長いリンクでも読みやすいよう、誤り訂正は軽めに。
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: url.length > 700 ? "L" : "M",
    margin: 2,
  });
}
