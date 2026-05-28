import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export const metadata: Metadata = {
  title: "店舗管理 | NIGHT VISION",
  robots: { index: false, follow: false },
  manifest: "/owner-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NV 店舗管理",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="manifest" href="/owner-manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NV 店舗管理" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      {children}
    </>
  );
}
