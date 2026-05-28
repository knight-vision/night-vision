import Header from "@/components/Header";
import { getAllSlugs, getShopBySlug, supabase } from "@/lib/shops";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import FavoriteButton from "@/components/FavoriteButton";
import PhotoViewer from "@/components/PhotoViewer";

export const dynamic = "force-dynamic";

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
  const area = shop.area_category ?? shop.area ?? "";
  const castNames = (shop.casts ?? []).slice(0, 3).map((c: any) => c.name).join("・");
  const desc = `${shop.name}は釧路${area}エリアにある${shop.type}です。` +
    (shop.description ? shop.description.slice(0, 80) : "") +
    `営業時間：${shop.open_hour ?? ""}。` +
    (shop.budget ? `予算：${shop.budget}。` : "") +
    (castNames ? `在籍キャスト：${castNames}など。` : "") +
    `釧路${shop.type}をお探しならナイトビジョンで。`;
  return {
    title: `${shop.name}｜釧路${area}の${shop.type}【公式情報】`,
    description: desc.slice(0, 160),
    keywords: [
      shop.name,
      `釧路 ${shop.name}`,
      `${area} ${shop.name}`,
      `釧路 ${shop.type}`,
      `釧路 ${area} ${shop.type}`,
      `${shop.name} 釧路`,
      `${shop.name} ${shop.type}`,
      `${shop.name} 営業時間`,
      `${shop.name} 料金`,
      `${shop.name} キャスト`,
      `釧路 ${shop.type} 料金`,
      `釧路 夜遊び ${shop.type}`,
    ],
    openGraph: {
      title: `${shop.name}｜釧路${area}の${shop.type}`,
      description: desc.slice(0, 100),
      url: "https://www.night-vision.jp/shop/" + shop.slug,
      siteName: "釧路ナイトビジョン",
      images: shop.image ? [{ url: shop.image }] : [],
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

  // つぶやきを取得（service_roleでRLSをバイパス）
  const { createClient } = await import("@supabase/supabase-js");
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const now = new Date().toISOString();
  const { data: tweetList } = await adminSupabase
    .from("shop_tweets")
    .select("message, created_at, expires_at")
    .eq("shop_id", shop.id)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1);
  const tweet = tweetList?.[0] ?? null;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Header />

      {/* 非表示バナー（管理者プレビュー時のみ） */}
      {(shop as any).hidden && (
        <div style={{ background: "#f59e0b22", border: "1px solid #f59e0b44", padding: "10px 16px", textAlign: "center", fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>
          🙈 この店舗は現在非表示設定中です（管理者プレビュー）
        </div>
      )}

      {/* ヒーロー写真 */}
      {(() => {
        const allPhotos = (shop.photos ?? []);
        const photos = shop.image
          ? [shop.image, ...allPhotos.filter((p) => p !== shop.image)]
          : allPhotos;
        if (photos.length > 0) return <PhotoViewer photos={photos} shopName={shop.name} />;
        return (
          <div style={{
            height: 260, background: `linear-gradient(135deg, ${tc.border}33, var(--bg-card))`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 56, opacity: 0.2 }}>🦉</span>
          </div>
        );
      })()}

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* 戻るボタン */}
        <div style={{ padding: "14px 0 0" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "var(--text-muted)", fontSize: 12,
            border: "1px solid var(--border)", padding: "4px 12px", borderRadius: 20,
          }}>← 一覧に戻る</Link>
        </div>

        {/* 店舗ヘッダー */}
        <div style={{ padding: "16px 0 20px" }}>
          {/* つぶやき */}
          {tweet && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: tc.border + "12", border: `1px solid ${tc.border}44`,
              borderRadius: 14, padding: "10px 14px", marginBottom: 14,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>💬</span>
              <div style={{ flex: 1 }}>
                <span style={{ color: tc.text, fontSize: 14, fontWeight: 700 }}>{tweet.message}</span>
                <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>
                  {(() => {
                    const d = (Date.now() - new Date(tweet.created_at).getTime()) / 60000;
                    return d < 1 ? "たった今" : d < 60 ? `${Math.floor(d)}分前` : `${Math.floor(d/60)}時間前`;
                  })()}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{
              padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: `1px solid ${tc.border}`, color: tc.text, background: tc.border + "18",
            }}>{shop.type}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-input)", padding: "3px 10px", borderRadius: 20 }}>
              {shop.area_category ?? shop.area}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{ color: "var(--text-primary)", fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", flex: 1, lineHeight: 1.2 }}>
              {shop.name}
            </h1>
            <FavoriteButton shopId={shop.id} size={24} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.85, margin: 0 }}>
            {shop.description}
          </p>
        </div>

        {/* 店舗情報 */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 14 }}>SHOP INFO</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { icon: "🕐", label: "営業時間", value: shop.open_hour },
              { icon: "📅", label: "定休日", value: shop.closed_days
                ? shop.closed_days.split("・").map((d: string) => {
                    const map: Record<string, string> = { 月:"月曜日", 火:"火曜日", 水:"水曜日", 木:"木曜日", 金:"金曜日", 土:"土曜日", 日:"日曜日", 祝:"祝日" };
                    return map[d.trim()] || d;
                  }).join("・")
                : null },
              { icon: "💴", label: "予算目安", value: shop.budget },
              { icon: "💺", label: "席数", value: shop.seats ? shop.seats + "席" : null },
              { icon: "📍", label: "所在地", value: shop.area },
              { icon: "📞", label: "電話番号", value: shop.tel },
            ].filter(i => i.value).map((item, idx, arr) => (
              <div key={item.label} style={{
                display: "flex", gap: 12, padding: "11px 0",
                borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: "center" as const }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, width: 58 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, flex: 1 }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* SNSリンク */}
          {(shop.instagram || shop.x_account || shop.tiktok_account) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              {shop.instagram && (
                <a href={"https://instagram.com/" + shop.instagram} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)", color: "#fff", padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  📷 Instagram
                </a>
              )}
              {shop.x_account && (
                <a href={"https://x.com/" + shop.x_account} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  𝕏 X
                </a>
              )}
              {shop.tiktok_account && (
                <a href={"https://tiktok.com/@" + shop.tiktok_account} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  🎵 TikTok
                </a>
              )}
            </div>
          )}

          {(shop.tags ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              {(shop.tags ?? []).map((t: string) => (
                <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>#{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* 本日出勤キャスト */}
        {(shop.casts ?? []).filter(c => c.on_today === true).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--online)", letterSpacing: "0.12em", marginBottom: 14 }}>
              ● 本日出勤 ({(shop.casts ?? []).filter(c => c.on_today === true).length}名)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(shop.casts ?? []).filter(c => c.on_today === true).map((cast) => (
                <Link key={cast.id} href={"/cast/" + cast.id} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--online)44", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{
                      width: "100%", aspectRatio: "1", overflow: "hidden",
                      background: `linear-gradient(135deg, ${tc.border}33, var(--bg-input))`,
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}>
                      {(cast as any).icon_photo
                        ? <img src={(cast as any).icon_photo} alt={cast.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 48, opacity: 0.4 }}>👩</span>}
                      <div style={{ position: "absolute", top: 8, right: 8, background: "var(--online)", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#fff" }}>出勤中</div>
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{cast.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                        {cast.age && `${cast.age}歳`}{cast.birthplace && ` / ${cast.birthplace}`}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* システム */}
        {shop.system && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 12 }}>💰 システム</h2>
            <div style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 2, whiteSpace: "pre-wrap" }}>{shop.system}</div>
          </div>
        )}

        {/* 求人 */}
        {jobs && jobs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: `linear-gradient(135deg, ${tc.border}18, var(--bg-card))`, border: `1px solid ${tc.border}44`, borderRadius: 20, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tc.text, letterSpacing: "0.12em", marginBottom: 2 }}>HIRING</div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>スタッフ募集中 💼</h2>
                </div>
                <Link href={`/shop/${shop.slug}/jobs`} style={{ fontSize: 12, color: tc.text, textDecoration: "none", border: `1px solid ${tc.border}`, padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap" }}>
                  すべて見る
                </Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {jobs.map((job: any) => (
                  <Link key={job.id} href={`/shop/${shop.slug}/jobs/${job.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "var(--bg-card)", borderRadius: 14, padding: "14px 16px", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, marginBottom: 6 }}>{job.title}</div>
                      {(job.hourly_wage_min || job.hourly_wage_max) && (
                        <div style={{ color: tc.text, fontWeight: 900, fontSize: 20, marginBottom: 4 }}>
                          ¥{job.hourly_wage_min?.toLocaleString()}{job.hourly_wage_max ? `〜¥${job.hourly_wage_max.toLocaleString()}` : "〜"}
                          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>/時</span>
                        </div>
                      )}
                      {job.work_days && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{job.work_days}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SNS（削除済み - SHOP INFOに移動） */}

        {/* Google Map */}
        {mapAddress && (
          <div style={{ marginBottom: 20, borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)" }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed&z=18&hl=ja`}
              width="100%" height="280" style={{ border: "none", display: "block" }}
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* キャスト一覧 */}
        {(shop.casts ?? []).length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: 14 }}>
              CAST ({(shop.casts ?? []).length}名)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(shop.casts ?? []).map((cast) => (
                <Link key={cast.id} href={"/cast/" + cast.id} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--bg-card)", border: `1px solid ${cast.on_today === true ? "var(--online)44" : "var(--border)"}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{
                      width: "100%", aspectRatio: "1", overflow: "hidden",
                      background: `linear-gradient(135deg, ${tc.border}33, var(--bg-input))`,
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}>
                      {(cast as any).icon_photo
                        ? <img src={(cast as any).icon_photo} alt={cast.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 48, opacity: 0.4 }}>👩</span>}
                      {cast.on_today === true && (
                        <div style={{ position: "absolute", top: 8, right: 8, background: "var(--online)", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#fff" }}>出勤中</div>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{cast.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                        {cast.age && `${cast.age}歳`}{cast.birthplace && ` / ${cast.birthplace}`}
                      </div>
                      {cast.comment && (
                        <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4, lineHeight: 1.5,
                          display: "-webkit-box" as any, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>
                          {cast.comment}
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: cast.on_today === true ? "var(--online)" : cast.on_today === false ? "#ff4444" : "var(--border)" }} />
                        <span style={{ fontSize: 10, color: cast.on_today === true ? "var(--online)" : cast.on_today === false ? "#ff4444" : "var(--text-hint)" }}>
                          {cast.on_today === true ? "本日出勤" : cast.on_today === false ? "本日休み" : "未定"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": ["BarOrPub", "LocalBusiness"],
          name: shop.name, description: shop.description,
          address: { "@type": "PostalAddress", streetAddress: shop.area, addressLocality: "釧路市", addressRegion: "北海道", addressCountry: "JP" },
          url: `https://www.night-vision.jp/shop/${shop.slug}`, telephone: shop.tel, openingHours: shop.open_hour, priceRange: shop.budget,
        })}} />
      </main>
    </div>
  );
}
