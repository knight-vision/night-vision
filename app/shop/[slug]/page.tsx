import Header from "@/components/Header";
import { getAllSlugs, getShopBySlug } from "@/lib/shops";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import PhotoSlider from "@/components/PhotoSlider";

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
  スナック:       { border: "#ff6b9d", text: "#ff6b9d" },
  ガールズバー:   { border: "#00d4ff", text: "#00d4ff" },
  ラウンジ:       { border: "#ffd700", text: "#ffd700" },
  カジュアルバー: { border: "#a855f7", text: "#a855f7" },
};

const AGE_LABELS: Record<string, string> = {
  "20代": "20代", "30代": "30代", "40代": "40代", "50代": "50代", "60代": "60代",
};

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();
  if (!shop) return null;

  const tc = TYPE_COLORS[shop.type] ?? { border: "var(--accent)", text: "var(--accent)" };
  const hasBanner = shop.plan === "premium" || shop.referred;

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--text-muted)", fontSize: 13, marginBottom: 20,
          border: "1px solid var(--border)", padding: "5px 14px", borderRadius: 20,
        }}>
          ← 一覧に戻る
        </Link>

        {hasBanner && (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, height: 200 }}>
            {shop.image ? (
              <img src={shop.image} alt={shop.name + "の店内"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, " + tc.border + "22, var(--bg-card))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-hint)", fontSize: 14,
              }}>写真準備中</div>
            )}
          </div>
        )}

        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 24, marginBottom: 20, marginTop: 20,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{
              padding: "2px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: "1px solid " + tc.border, color: tc.text, background: tc.border + "18",
            }}>{shop.type}</span>
            <span style={{
              fontSize: 12, color: "var(--text-muted)",
              background: "var(--bg-input)", padding: "2px 10px", borderRadius: 10,
            }}>{shop.area_category ?? shop.area}</span>
          </div>

          <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, marginBottom: 10, letterSpacing: "-0.03em" }}>
            {shop.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            {shop.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "予算目安", value: shop.budget, icon: "💴" },
              { label: "営業時間", value: shop.open_hour, icon: "🕐" },
              { label: "電話番号", value: shop.tel, icon: "📞" },
              { label: "席数", value: shop.seats ? shop.seats + "席" : "未設定", icon: "💺" },
              { label: "定休日", value: shop.closed_days ?? "未設定", icon: "📅" },
              { label: "エリア", value: shop.area, icon: "📍" },
            ].map((item) => (
              <div key={item.label} style={{
                background: "var(--bg-input)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "10px 14px",
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{item.icon} {item.label}</div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>

          {shop.age_groups && shop.age_groups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>👥 年齢層</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {shop.age_groups.map((age) => (
                  <span key={age} style={{
                    fontSize: 12, color: "var(--text-secondary)",
                    background: "var(--bg-input)", border: "1px solid var(--border)",
                    padding: "3px 12px", borderRadius: 20,
                  }}>{AGE_LABELS[age] ?? age}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {shop.tags.map((t) => (
              <span key={t} style={{
                fontSize: 12, color: "var(--text-muted)",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                padding: "3px 10px", borderRadius: 20,
              }}>{t}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {shop.instagram && (
              <a href={"https://instagram.com/" + shop.instagram} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#e1306c", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                @{shop.instagram}
              </a>
            )}
            {shop.x_account && (
              <a href={"https://x.com/" + shop.x_account} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.95-5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                @{shop.x_account}
              </a>
            )}
            {shop.tiktok_account && (
              <a href={"https://tiktok.com/@" + shop.tiktok_account} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#69C9D0", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
                </svg>
                @{shop.tiktok_account}
              </a>
            )}
          </div>
        </div>

        {shop.photos && shop.photos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
              店内写真
            </h2>
            <PhotoSlider photos={shop.photos} shopName={shop.name} />
          </div>
        )}

        <div>
          <h2 style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
            キャスト ({shop.casts.length}名)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shop.casts.map((cast) => (
              <Link key={cast.id} href={"/cast/" + cast.id} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>👩</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{cast.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{cast.age}歳</span>
                      {cast.birthplace && <span style={{ color: "var(--text-hint)", fontSize: 11 }}>📍{cast.birthplace}</span>}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>{cast.comment}</div>
                  </div>
                  <div style={{ fontSize: 11, color: cast.on_today ? "var(--online)" : "var(--text-hint)", flexShrink: 0 }}>
                    <span style={{
                      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                      background: cast.on_today ? "var(--online)" : "var(--border-hover)",
                      marginRight: 4, verticalAlign: "middle",
                    }} />
                    {cast.on_today ? "本日出勤" : "本日休み"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}