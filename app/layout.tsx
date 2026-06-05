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
    default: "NIGHT VISION｜全国のキャバクラ・ガールズバー・スナック・ラウンジ情報",
    template: "%s｜NIGHT VISION",
  },
  description: "全国のキャバクラ・ガールズバー・スナック・ラウンジ・飲み屋の最新情報をまとめたナイトライフガイド。札幌・新宿・六本木・釧路など各エリアのお店の雰囲気・料金・キャスト情報・本日の出勤情報を掲載。",
  keywords: [
    "キャバクラ", "ガールズバー", "スナック", "ラウンジ",
    "ニュークラ", "カジュアルバー", "ナイトライフ", "夜遊び",
    "札幌 キャバクラ", "すすきの キャバクラ", "新宿 キャバクラ", "歌舞伎町 キャバクラ",
    "六本木 ラウンジ", "釧路 スナック", "釧路 ガールズバー", "釧路 飲み屋",
    "上野 スナック", "立川 ガールズバー", "帯広 スナック",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NIGHT VISION",
              alternateName: ["ナイトビジョン", "ナイトビジョン 全国"],
              url: "https://www.night-vision.jp",
              inLanguage: "ja",
              description: "全国のキャバクラ・ガールズバー・スナック・ラウンジ情報を掲載するナイトライフガイド。",
            }),
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}