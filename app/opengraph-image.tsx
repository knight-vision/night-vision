import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NIGHT VISION｜全国のキャバクラ・ガールズバー・スナック・ラウンジ情報";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #08080f 0%, #1a1028 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{
          fontSize: 64, fontWeight: 900, letterSpacing: "-2px",
          background: "linear-gradient(135deg, #ff6b9d, #a855f7)",
          backgroundClip: "text",
          color: "transparent",
          marginBottom: 16,
        }}>
          NIGHT VISION
        </div>
        <div style={{ fontSize: 22, color: "#ffffff66", marginBottom: 32 }}>
          NIGHTLIFE GUIDE
        </div>
        <div style={{ fontSize: 20, color: "#ffffff55" }}>
          全国のキャバクラ・ガールズバー・スナック・ラウンジ情報
        </div>
      </div>
    ),
    { ...size }
  );
}