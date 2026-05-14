"use client";
import { useState } from "react";

type Props = {
  photos: string[];
  shopName: string;
};

export default function PhotoViewer({ photos, shopName }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        {/* 1枚目はメインバナー */}
        <div
          onClick={() => setLightbox(photos[0])}
          style={{ borderRadius: 16, overflow: "hidden", marginBottom: photos.length > 1 ? 8 : 0, height: 220, cursor: "zoom-in" }}
        >
          <img src={photos[0]} alt={shopName + "の写真"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        {/* 2枚目以降はスライダー */}
        {photos.length > 1 && (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", display: "flex", gap: 8, paddingBottom: 4 }}>
            {photos.slice(1, 10).map((photo, i) => (
              <div
                key={i}
                onClick={() => setLightbox(photo)}
                style={{ flexShrink: 0, width: 200, height: 140, borderRadius: 12, overflow: "hidden", scrollSnapAlign: "start", cursor: "zoom-in" }}
              >
                <img src={photo} alt={shopName + "の写真" + (i + 2)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ライトボックス */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "#000000cc",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%" }}>
            <img
              src={lightbox}
              alt=""
              style={{ maxWidth: "100vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }}
            />
            <button
              onClick={() => setLightbox(null)}
              style={{
                position: "absolute", top: -12, right: -12,
                width: 32, height: 32, borderRadius: "50%",
                background: "#fff", border: "none", cursor: "pointer",
                fontSize: 16, fontWeight: 900, color: "#000",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>
      )}
    </>
  );
}