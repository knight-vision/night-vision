"use client";
import Image from "next/image";

export default function PhotoSlider({ photos, shopName }: { photos: string[]; shopName: string }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory", display: "flex", gap: 10, paddingBottom: 8 }}>
      {photos.slice(0, 10).map((photo, i) => (
        <div key={i} style={{ position: "relative", flexShrink: 0, width: 260, height: 180, borderRadius: 12, overflow: "hidden", scrollSnapAlign: "start" }}>
          <Image src={photo} alt={shopName + "の店内" + (i + 1)} fill sizes="260px" style={{ objectFit: "cover" }} />
        </div>
      ))}
    </div>
  );
}