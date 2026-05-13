import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のカジュアルバー一覧",
  description: "釧路のカジュアルバー情報を掲載。地元の若者が集まる出会いの場、釧路のバー情報はここで。",
  keywords: ["釧路 バー", "釧路 カジュアルバー", "釧路 出会い バー"],
};

export const revalidate = 60;

export default async function CasualBarPage() {
  const shops = await getShopsByType("カジュアルバー");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#a855f7", letterSpacing: "0.15em", marginBottom: 6 }}>CASUAL BAR</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>釧路のカジュアルバー</h1>
          <p style={{ color: "#ffffff55", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路市内のカジュアルバー {shops.length}件を掲載。地元の男女が集まるバーを紹介します。
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.length === 0
            ? <p style={{ color: "#ffffff33", fontSize: 14 }}>現在掲載中の店舗はありません。</p>
            : shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      </main>
    </>
  );
}