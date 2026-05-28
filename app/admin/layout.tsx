import type { Metadata } from "next";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "NV 管理画面",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    title: "NV Admin",
    statusBarStyle: "black-translucent",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <head>
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="NV Admin" />
      </head>
      {children}
    </>
  );
}
