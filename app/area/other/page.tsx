import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShops } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路 その他エリアの飲み屋一覧",
  description: "釧路のその他エリアのスナック・ガールズバー・ラウンジ情報。",
};

export const revalidate = 60;

export default async function OtherAreaPage() {
  const allShops = await getShops();
  const shops = allShops.filter((s) => s.area_category === "その他" || !s.area_category);
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 6 }}>AREA</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>その他エリア</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>その他エリアの店舗 {shops.length}件</p>
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