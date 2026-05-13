import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のラウンジ/ニュークラ一覧",
  description: "釧路のラウンジ/ニュークラ情報を掲載。高級感のある空間でゆっくり過ごせる釧路市内の人気ラウンジを紹介。",
};

export const revalidate = 60;

export default async function LoungePage() {
  const shops = await getShopsByType("ラウンジ");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#ffd700", letterSpacing: "0.15em", marginBottom: 6 }}>LOUNGE/NEW CLUB</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>釧路のラウンジ/ニュークラ</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路市内のラウンジ/ニュークラ {shops.length}件を掲載。
          </p>
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