import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TuneTable",
    template: "%s | TuneTable",
  },
  description:
    "パーティーや集まりで流す音楽・動画を、参加者みんなの投票で決めるキューアプリ。インストールも登録も不要、QRを読むだけで参加できます。",
  applicationName: "TuneTable",
  openGraph: {
    title: "TuneTable",
    description: "流す曲を、その場のみんなの投票で決める。",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0711",
  colorScheme: "dark",
  // 暗い部屋での片手操作が前提。意図しないピンチズームは邪魔になるが、
  // 拡大自体を禁止すると読みづらい人が使えなくなるので上限だけ設ける。
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stage text-ink">{children}</body>
    </html>
  );
}
