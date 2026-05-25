import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "末広エリアの飲み屋・スナック・ガールズバー・ラウンジ一覧｜釧路",
  description: "釧路末広エリアの飲み屋・スナック・ガールズバー・ラウンジ・キャバクラ・ニュークラ情報。末広町周辺のお店を地域密着で紹介。",
  keywords: ["末広 飲み屋", "末広 スナック", "末広 ガールズバー", "末広 ラウンジ", "末広 キャバクラ", "末広 ニュークラ", "釧路 末広 バー"],
  alternates: { canonical: "https://www.night-vision.jp/area/suehiro" },
};

export const revalidate = 60;

export default async function SuehiroPage() {
  const allShops = await getShops();
  const shops = allShops.filter((s) => s.area_category === "末広");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 6 }}>AREA</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>末広エリア</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>末広エリアの店舗 {shops.length}件</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.length === 0
            ? <p style={{ color: "var(--text-hint)", fontSize: 14 }}>現在掲載中の店舗はありません。</p>
            : shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      </main>
    </>
  );
}