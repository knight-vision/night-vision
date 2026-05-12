import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のラウンジ一覧",
  description: "釧路のラウンジ情報を掲載。高級感のある空間でゆっくり過ごせる釧路市内の人気ラウンジを紹介。接待・記念日にも最適。",
};

export const revalidate = 60;

export default async function LoungePage() {
  const shops = await getShopsByType("ラウンジ");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: "0.15em", marginBottom: 6 }}>LOUNGE</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>釧路のラウンジ</h1>
          <p style={{ color: "#ffffff55", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路市内のラウンジ {shops.length}件を掲載。接待・記念日・特別な夜におすすめのお店を紹介します。
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      </main>
    </>
  );
}