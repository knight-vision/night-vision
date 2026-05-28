"use client";
import { useEffect } from "react";

// iOSホーム画面追加時に正しいstart_urlを使わせるため
// layoutの<link rel="manifest">を動的に上書きする
export default function PwaManifestInjector({ manifestUrl }: { manifestUrl: string }) {
  useEffect(() => {
    // 既存のmanifestリンクを削除
    const existing = document.querySelectorAll('link[rel="manifest"]');
    existing.forEach(el => el.remove());
    // 新しいmanifestリンクを追加
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = manifestUrl;
    document.head.appendChild(link);
  }, [manifestUrl]);
  return null;
}
