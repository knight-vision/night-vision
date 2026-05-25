import Header from "@/components/Header";
import ShopCard from "@/components/ShopCard";
import { getShopsByType } from "@/lib/shops";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "釧路のラウンジ・ニュークラ一覧｜末広・愛国エリア",
  description: "釧路のラウンジ・ニュークラ情報を掲載。末広・愛国エリアの人気ラウンジを料金・雰囲気・キャスト情報とともに紹介。",
  keywords: ["釧路 ラウンジ", "釧路 ニュークラ", "釧路 キャバクラ", "末広 ラウンジ", "末広 ニュークラ"],
  alternates: { canonical: "https://www.night-vision.jp/lounge" },
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