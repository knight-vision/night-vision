import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "愛国エリアの飲み屋・スナック・ガールズバー・ラウンジ一覧｜釧路",
  description: "釧路愛国エリアの飲み屋・スナック・ガールズバー・ラウンジ情報。愛国周辺のお店を地域密着で紹介。",
  keywords: ["愛国 飲み屋", "愛国 スナック", "愛国 ガールズバー", "愛国 ラウンジ", "釧路 愛国 バー"],
};

export const revalidate = 60;

export default async function AikokuPage() {
  const allShops = await getShops();
  const shops = allShops.filter((s) => s.area_category === "愛国");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: "0.15em", marginBottom: 6 }}>AREA</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>愛国エリア</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>愛国エリアの店舗 {shops.length}件</p>
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