"use client";
import { useState } from "react";

export default function CastPhotoSwiper({ photos, castName }: { photos: string[]; castName: string }) {
  const [current, setCurrent] = useState(0);

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 20, overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", padding: "14px 20px 10px" }}>
        フォトギャラリー
      </div>

      {/* メイン写真 */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#0a0a14" }}>
        <img
          src={photos[current]}
          alt={`${castName} ${current + 2}枚目`}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setCurrent(c => (c - 1 + photos.length) % photos.length)}
              style={{
                position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
                width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >‹</button>
            <button
              onClick={() => setCurrent(c => (c + 1) % photos.length)}
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
                width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >›</button>
          </>
        )}
        {/* ページインジケーター */}
        <div style={{
          position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 5,
        }}>
          {photos.map((_, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{
              width: i === current ? 18 : 6, height: 6, borderRadius: 3,
              background: i === current ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: "pointer", transition: "width 0.2s",
            }} />
          ))}
        </div>
      </div>

      {/* サムネイル */}
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px 12px", overflowX: "auto" }}>
          {photos.map((url, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{
              width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0,
              cursor: "pointer", border: `2px solid ${i === current ? "var(--accent)" : "transparent"}`,
            }}>
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
