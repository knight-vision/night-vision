import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export const metadata: Metadata = {
  metadataBase: new URL("https://www.night-vision.jp"),
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ナイトビジョン",
  },
  title: {
    default: "NIGHT VISION｜釧路の飲み屋・スナック・ガールズバー・ラウンジ情報",
    template: "%s｜NIGHT VISION",
  },
  description: "釧路のスナック・ガールズバー・ラウンジ・飲み屋の最新情報をまとめた地域密着型ナイトガイド。お店の雰囲気・料金・キャスト情報を掲載。",
  keywords: [
    "釧路 飲み屋", "釧路 スナック", "釧路 ガールズバー",
    "釧路 ラウンジ", "釧路 キャバクラ", "釧路 ニュークラ",
    "釧路 カジュアルバー", "釧路 バー", "釧路 メンズバー",
    "釧路 夜遊び", "釧路 ナイトライフ",
    "末広 飲み屋", "末広 スナック", "末広 ガールズバー",
    "末広 ラウンジ", "末広 キャバクラ", "末広 ニュークラ",
    "末広 カジュアルバー", "末広 バー",
    "愛国 飲み屋", "愛国 スナック", "愛国 ガールズバー",
    "愛国 ラウンジ", "愛国 バー",
    "釧路市 夜", "釧路市 飲み屋", "北海道釧路 ナイトライフ",
  ],
  alternates: {},
  openGraph: { type: "website", locale: "ja_JP", siteName: "NIGHT VISION" },
  robots: { index: true, follow: true },
  verification: { google: "PpTaH4pdV66wwM5Syk8TQpIOvKZ3n2pZ2pNVfiEV2LE" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}