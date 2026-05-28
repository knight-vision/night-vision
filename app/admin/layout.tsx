import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#7c3aed",
};

export const metadata: Metadata = {
  title: "NV 管理画面",
  robots: { index: false, follow: false },
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NV Admin",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NV Admin" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      {children}
    </>
  );
}
