import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://night-vision.jp'),
  title: {
    default:
      '釧路ナイトビジョン｜釧路の飲み屋・スナック・ガールズバー・ラウンジ情報',
    template: '%s｜釧路ナイトビジョン',
  },
  icons: {
    icon: '/favicon.svg',
  },
  description:
    '釧路のスナック・ガールズバー・ラウンジ・飲み屋の最新情報をまとめた地域密着型ナイトガイド。お店の雰囲気・料金・キャスト情報を掲載。',
  keywords: [
    '釧路 飲み屋',
    '釧路 スナック',
    '釧路 ガールズバー',
    '釧路 ラウンジ',
    '釧路 キャバクラ',
    '釧路 夜遊び',
    '釧路 ナイトライフ',
    '釧路 バー',
  ],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: '釧路ナイトビジョン',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "PpTaH4pdV66wwM5Syk8TQpIOvKZ3n2pZ2pNVfiEV2LE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          background: '#08080f',
          color: '#fff',
          fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
