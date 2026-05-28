import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#db2777",
};

export const metadata: Metadata = {
  title: "キャストポータル | NIGHT VISION",
  robots: { index: false, follow: false },
  manifest: "/cast-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NV キャスト",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="manifest" href="/cast-manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NV キャスト" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      {children}
    </>
  );
}
