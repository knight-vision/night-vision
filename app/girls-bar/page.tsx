import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のガールズバー一覧",
  description: "釧路のガールズバー情報を掲載。料金・雰囲気・キャスト情報とともに釧路市内の人気ガールズバーを紹介。",
};

export const revalidate = 60;

export default async function GirlsBarPage() {
  const shops = await getShopsByType("ガールズバー");
  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: "0.15em", marginBottom: 6 }}>GIRLS BAR</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.03em" }}>釧路のガールズバー</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
            釧路市内のガールズバー {shops.length}件を掲載。
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