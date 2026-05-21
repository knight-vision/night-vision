import Header from "@/components/Header";
import { getAllSlugs, getShopBySlug, supabase } from "@/lib/shops";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import FavoriteButton from "@/components/FavoriteButton";
import PhotoViewer from "@/components/PhotoViewer";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}
async function recordPageView(shopId: number) {
  try {
    await supabase.from("view_events").insert({ shop_id: shopId });
    await supabase.rpc("increment_page_view", { shop_id: shopId });
  } catch {}
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const shop = await getShopBySlug(params.slug);
  if (!shop) return {};
  return {
    title: shop.name + "｜釧路" + (shop.area_category ?? "") + "の" + shop.type,
    description:
      shop.name + "は釧路" + (shop.area_category ?? "") + "エリアにある" + shop.type + "です。" +
      (shop.description ?? "") +
      "営業時間：" + (shop.open_hour ?? "") + "。" +
      "所在地：" + (shop.area ?? "") + "。",
    keywords: [
      shop.name,
      "釧路 " + shop.name,
      (shop.area_category ?? "") + " " + shop.name,
      "釧路 " + shop.type,
      "釧路 " + (shop.area_category ?? "") + " " + shop.type,
      shop.name + " 釧路",
      shop.name + " " + shop.type,
      shop.name + " 営業時間",
      shop.name + " 場所",
    ],
    openGraph: {
      title: shop.name + "｜釧路" + (shop.area_category ?? "") + "の" + shop.type,
      description: shop.name + "は釧路" + (shop.area_category ?? "") + "にある" + shop.type + "です。" + (shop.description ?? ""),
      url: "https://www.night-vision.jp/shop/" + shop.slug,
      siteName: "釧路ナイトビジョン",
      type: "website",
    },
    alternates: { canonical: "https://www.night-vision.jp/shop/" + shop.slug },
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

function stripFloor(address: string): string {
  return address
    .replace(/\s*[0-9０-９]+[FＦ].*$/g, "")
    .replace(/\s*[一二三四五六七八九十百]+階.*$/g, "")
    .replace(/\s*第?[0-9０-９]+階.*$/g, "")
    .trim();
}

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();
  if (!shop) return null;
  recordPageView(shop.id);

  // 求人情報を取得（最大3件）
  const { data: jobs } = await supabase
    .from("job_postings")
    .select("id, title, hourly_wage_min, hourly_wage_max, work_days, description")
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // 確定シフトから今日の出勤を反映
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data: todayShifts } = await supabase
    .from("confirmed_shifts")
    .select("cast_id")
    .eq("shop_id", shop.id)
    .eq("date", todayStr);
  const onTodayCastIds = new Set((todayShifts || []).map((s: any) => s.cast_id));
  // 確定シフトがある場合は上書き
  if (onTodayCastIds.size > 0) {
    shop.casts = shop.casts.map((c) => ({
      ...c,
      on_today: onTodayCastIds.has(c.id) ? true : (c.on_today === true ? true : null),
    }));
  }

  const tc = TYPE_COLORS[shop.type] ?? { border: "var(--accent)", text: "var(--accent)" };
  const hasBanner = shop.plan === "premium" || shop.referred;
  const mapAddress = shop.area ? stripFloor(shop.area) : null;

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

{/* バナー・写真スライダー統合 */}
{(() => {
          const allPhotos = (shop.photos ?? []);
          const photos = shop.image
            ? [shop.image, ...allPhotos.filter((p) => p !== shop.image)]
            : allPhotos;
          if (photos.length === 0 && !hasBanner) return null;
          if (photos.length === 0) return (
            <div style={{
              borderRadius: 16, overflow: "hidden", marginBottom: 20, height: 220,
              background: "linear-gradient(135deg, " + tc.border + "22, var(--bg-card))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-hint)", fontSize: 14,
            }}>写真準備中</div>
          );
          return <PhotoViewer photos={photos} shopName={shop.name} />;
        })()}

        {/* 店舗情報カード */}
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", flex: 1 }}>
              {shop.name}
            </h1>
            <FavoriteButton shopId={shop.id} size={22} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            {shop.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "予算目安", value: shop.budget, icon: "💴" },
              { label: "営業時間", value: shop.open_hour, icon: "🕐" },
              { label: "席数", value: shop.seats ? shop.seats + "席" : "未設定", icon: "💺" },
              { label: "定休日", value: shop.closed_days ?? "未設定", icon: "📅" },
              { label: "所在地", value: shop.area, icon: "📍" },
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

          {shop.tel && (
            <a href={"tel:" + shop.tel} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--bg-input)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "10px 18px", marginBottom: 16,
              color: "var(--online)", fontWeight: 700, fontSize: 14,
              textDecoration: "none",
            }}>
              📞 {shop.tel}（タップで電話）
            </a>
          )}

          {shop.age_groups && shop.age_groups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>👥 年齢層</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(shop.age_groups ?? []).map((age) => (
                  <span key={age} style={{
                    fontSize: 12, color: "var(--text-secondary)",
                    background: "var(--bg-input)", border: "1px solid var(--border)",
                    padding: "3px 12px", borderRadius: 20,
                  }}>{AGE_LABELS[age] ?? age}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {(shop.tags ?? []).map((t) => (
              <span key={t} style={{
                fontSize: 12, color: "var(--text-muted)",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                padding: "3px 10px", borderRadius: 20,
              }}>{t}</span>
            ))}
          </div>

          {/* SNSボタン */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {shop.instagram && (
              <a href={"https://instagram.com/" + shop.instagram} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                  color: "#fff", padding: "10px 20px", borderRadius: 25,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagramを見る · @{shop.instagram}
              </a>
            )}
            {shop.x_account && (
              <a href={"https://x.com/" + shop.x_account} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "var(--bg-input)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", padding: "10px 20px", borderRadius: 25,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.95-5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                @{shop.x_account}
              </a>
            )}
            {shop.tiktok_account && (
              <a href={"https://tiktok.com/@" + shop.tiktok_account} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "var(--bg-input)", border: "1px solid var(--border)",
                  color: "#69C9D0", padding: "10px 20px", borderRadius: 25,
                  fontSize: 14, fontWeight: 700, textDecoration: "none",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/>
                </svg>
                @{shop.tiktok_account}
              </a>
            )}
          </div>
        </div>

        {/* システム */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 20, marginBottom: 20,
        }}>
          <h2 style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
            💰 システム
          </h2>
          <div style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 2, whiteSpace: "pre-wrap" }}>
            {shop.system ?? "未登録"}
          </div>
        </div>

        {/* 求人情報 */}
        {jobs && jobs.length > 0 && (
          <div style={{
            background: "linear-gradient(135deg, var(--accent)18, var(--accent2)08)",
            border: "1px solid var(--accent)44",
            borderRadius: 16, padding: 20, marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ color: "var(--accent)", fontSize: 14, fontWeight: 800, letterSpacing: "0.08em" }}>
                💼 スタッフ募集中
              </h2>
              <Link href={`/shop/${shop.slug}/jobs`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                すべて見る →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.map((job: any) => (
                <div key={job.id} style={{
                  background: "var(--bg-card)", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, marginBottom: 4 }}>
                    {job.title}
                  </div>
                  {(job.hourly_wage_min || job.hourly_wage_max) && (
                    <div style={{ color: "var(--accent)", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                      ¥{job.hourly_wage_min?.toLocaleString()}{job.hourly_wage_max ? `〜¥${job.hourly_wage_max.toLocaleString()}` : "〜"}
                      <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>/時</span>
                    </div>
                  )}
                  {job.work_days && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{job.work_days}</div>
                  )}
                  <Link href={`/shop/${shop.slug}/jobs`} style={{
                    display: "inline-block", fontSize: 12, color: "var(--accent)",
                    background: "var(--accent)15", border: "1px solid var(--accent)44",
                    padding: "4px 12px", borderRadius: 20, textDecoration: "none", fontWeight: 700,
                  }}>
                    詳細を見る →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Google Map */}
        {mapAddress && (
          <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=18&hl=ja`}
              width="100%"
              height="280"
              style={{ border: "none", display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* キャスト */}
        <div>
          <h2 style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 12 }}>
            キャスト ({(shop.casts ?? []).length}名)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(shop.casts ?? []).map((cast) => (
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
                  <div style={{ fontSize: 11, color: cast.on_today === true ? "var(--online)" : cast.on_today === false ? "#ff4444" : "var(--text-hint)", flexShrink: 0 }}>
                    <span style={{
                      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                      background: cast.on_today === true ? "var(--online)" : cast.on_today === false ? "#ff4444" : "var(--border)",
                      marginRight: 4, verticalAlign: "middle",
                    }} />
                    {cast.on_today === true ? "本日出勤" : cast.on_today === false ? "本日休み" : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": ["BarOrPub", "LocalBusiness"],
              name: shop.name,
              description: shop.description,
              address: {
                "@type": "PostalAddress",
                streetAddress: shop.area,
                addressLocality: "釧路市",
                addressRegion: "北海道",
                addressCountry: "JP",
              },
              url: `https://www.night-vision.jp/shop/${shop.slug}`,
              telephone: shop.tel,
              openingHours: shop.open_hour,
              priceRange: shop.budget,
            }),
          }}
        />
      </main>
    </div>
  );
}