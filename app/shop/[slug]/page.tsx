import Header from "@/components/Header";
import { getAllSlugs, getShopBySlug } from "@/lib/shops";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const shop = await getShopBySlug(params.slug);
  if (!shop) return {};
  return {
    title: shop.name + "｜釧路 " + shop.type,
    description: shop.name + "は釧路" + shop.area + "にある" + shop.type + "です。" + shop.description,
  };
}

const TYPE_COLORS: Record<string, { border: string; text: string }> = {
  スナック: { border: "#ff6b9d", text: "#ff6b9d" },
  ガールズバー: { border: "#00d4ff", text: "#00d4ff" },
  ラウンジ: { border: "#ffd700", text: "#ffd700" },
};

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();
  if (!shop) return null;

  const tc = TYPE_COLORS[shop.type] ?? { border: "#fff", text: "#fff" };
  const hasBanner = shop.plan === "premium" || shop.referred;

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#ffffff55", fontSize: 13, marginBottom: 20, border: "1px solid #ffffff1a", padding: "5px 14px", borderRadius: 20 }}>
          ← 一覧に戻る
        </Link>

        {hasBanner && (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, height: 200 }}>
            {shop.image ? (
              <img src={shop.image} alt={shop.name + "の店内"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, " + tc.border + "22, #0f0f1a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff22", fontSize: 14 }}>
                写真準備中
              </div>
            )}
          </div>
        )}

        <div style={{ background: "linear-gradient(160deg, #0f0f1a, #1a1028)", border: "1px solid #ffffff0f", borderRadius: 20, padding: 24, marginBottom: 20, marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ padding: "2px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid " + tc.border, color: tc.text, background: tc.border + "18" }}>
              {shop.type}
            </span>
            <span style={{ fontSize: 12, color: "#ffffff44", background: "#ffffff08", padding: "2px 10px", borderRadius: 10 }}>
              {shop.area}
            </span>
          </div>

          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, marginBottom: 10, letterSpacing: "-0.03em" }}>
            {shop.name}
          </h1>
          <p style={{ color: "#ffffff88", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            {shop.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "予算目安", value: shop.budget, icon: "💴" },
              { label: "営業時間", value: shop.open_hour, icon: "🕐" },
              { label: "電話番号", value: shop.tel, icon: "📞" },
              { label: "Instagram", value: shop.instagram ? "@" + shop.instagram : "なし", icon: "📷" },
            ].map((item) => (
              <div key={item.label} style={{ background: "#ffffff06", border: "1px solid #ffffff0a", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "#ffffff44", marginBottom: 3 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: 13, color: "#ffffffcc", fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shop.tags.map((t) => (
              <span key={t} style={{ fontSize: 12, color: "#ffffff66", background: "#ffffff0a", border: "1px solid #ffffff15", padding: "3px 10px", borderRadius: 20 }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ color: "#ffffff55", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
            キャスト ({shop.casts.length}名)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shop.casts.map((cast) => (
              <div key={cast.id} style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "1px solid #ffffff0f", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b9d, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  👩
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{cast.name}</span>
                    <span style={{ color: "#ffffff44", fontSize: 12 }}>{cast.age}歳</span>
                  </div>
                  <div style={{ color: "#ffffff66", fontSize: 12, marginTop: 2 }}>{cast.comment}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: cast.on_today ? "#00ff88" : "#555" }}>
                    <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: cast.on_today ? "#00ff88" : "#444", marginRight: 4, verticalAlign: "middle" }} />
                    {cast.on_today ? "本日出勤" : "本日休み"}
                  </div>
                  {cast.instagram && (
                    <a href={"https://instagram.com/" + cast.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#a855f7", marginTop: 4, display: "block" }}>
                      📷 Instagram
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}