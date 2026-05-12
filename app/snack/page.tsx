import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のスナック一覧",
  description: "釧路のスナック情報を掲載。末広町・北大通エリアの人気スナックを料金・雰囲気・キャスト情報とともに紹介。釧路でスナックを探すならここ。",
};

export const revalidate = 60;

export default async function SnackPage() {
  const shops = await getShopsByType("スナック");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#ff6b9d", letterSpacing: "0.15em", marginBottom: 6 }}>SNACK</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>釧路のスナック</h1>
          <p style={{ color: "#ffffff55", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路市内のスナック {shops.length}件を掲載。カラオケ・ママとの会話を楽しめるお店を紹介します。
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
        </div>
      </main>
    </>
  );
}