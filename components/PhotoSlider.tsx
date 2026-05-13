"use client";

export default function PhotoSlider({ photos, shopName }: { photos: string[]; shopName: string }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", display: "flex", gap: 10, paddingBottom: 8 }}>
      {photos.slice(0, 10).map((photo, i) => (
        <div key={i} style={{ flexShrink: 0, width: 260, height: 180, borderRadius: 12, overflow: "hidden", scrollSnapAlign: "start" }}>
          <img src={photo} alt={shopName + "の店内" + (i + 1)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
}