"use client";
import { useState, useRef } from "react";
import Image from "next/image";

export default function CastPhotoSwiper({ photos, castName }: { photos: string[]; castName: string }) {
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = (dir: -1 | 1) => setCurrent(c => (c + dir + photos.length) % photos.length);

  // スワイプ
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* メイン写真（四角・タップで拡大） */}
      <div
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        onClick={() => setZoom(true)}
        style={{ position: "relative", width: "100%", aspectRatio: "3/4", background: "#06060c", borderRadius: 16, overflow: "hidden", cursor: "zoom-in" }}
      >
        <Image src={photos[current]} alt={`${castName} ${current + 1}枚目`} fill sizes="(max-width: 680px) 100vw, 680px" style={{ objectFit: "cover" }} priority />

        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, padding: "3px 10px", borderRadius: 20 }}>{current + 1} / {photos.length}</div>
        <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>🔍 タップで拡大</div>

        {photos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={navBtn("left")}>‹</button>
            <button onClick={(e) => { e.stopPropagation(); go(1); }} style={navBtn("right")}>›</button>
            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
              {photos.map((_, i) => (
                <div key={i} style={{ width: i === current ? 18 : 6, height: 6, borderRadius: 3, background: i === current ? "#fff" : "rgba(255,255,255,0.4)", transition: "width 0.2s" }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* サムネイル（四角・同サイズ） */}
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
          {photos.map((url, i) => (
            <div key={i} onClick={() => setCurrent(i)} style={{
              position: "relative", width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0,
              cursor: "pointer", border: `2px solid ${i === current ? "var(--accent)" : "transparent"}`,
            }}>
              <Image src={url} alt={`${castName} サムネイル${i + 1}`} fill sizes="60px" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>
      )}

      {/* 拡大表示モーダル */}
      {zoom && (
        <div
          onClick={() => setZoom(false)}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.94)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button onClick={(e) => { e.stopPropagation(); setZoom(false); }} style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 2 }}>✕</button>
          <div style={{ position: "relative", width: "100%", maxWidth: 680, aspectRatio: "3/4", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
            <Image src={photos[current]} alt={`${castName} ${current + 1}枚目`} fill sizes="100vw" style={{ objectFit: "contain" }} />
          </div>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={navBtn("left")}>‹</button>
              <button onClick={(e) => { e.stopPropagation(); go(1); }} style={navBtn("right")}>›</button>
              <div style={{ position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                {photos.map((_, i) => (
                  <div key={i} style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 4, background: i === current ? "#fff" : "rgba(255,255,255,0.4)" }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function navBtn(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute", [side]: 10, top: "50%", transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
    width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
  };
}
