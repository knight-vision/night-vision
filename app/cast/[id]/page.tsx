import Header from "@/components/Header";
import { supabase } from "@/lib/shops";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import CastPhotoSwiper from "@/components/CastPhotoSwiper";

export const revalidate = 60;

async function getCast(id: string) {
  const { data, error } = await supabase
    .from("casts")
    .select("*, shops(name, slug, type)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

// 承認済み写真を取得
async function getCastApprovedPhotos(castId: string): Promise<string[]> {
  const { data } = await supabase
    .from("photo_requests")
    .select("url, sort_order")
    .eq("cast_id", Number(castId))
    .eq("status", "approved")
    .order("sort_order");
  return (data || []).map((p: any) => p.url);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cast = await getCast(params.id);
  if (!cast) return {};
  return {
    title: cast.name + "｜" + cast.shops.name,
    description: cast.name + "は釧路の" + cast.shops.name + "に在籍しています。" + cast.comment,
    alternates: { canonical: "https://www.night-vision.jp/cast/" + params.id },
    // キャストページは現状コンテンツが薄いため検索インデックスから除外し、
    // クロール予算を業種・店舗ページに集中させる。
    // 将来コンテンツが充実したらこのrobots設定を外せばインデックス対象に戻せる。
    robots: { index: false, follow: true },
  };
}

export default async function CastPage({ params }: { params: { id: string } }) {
  const cast = await getCast(params.id);
  if (!cast) notFound();
  if (!cast) return null;

  const approvedPhotos = await getCastApprovedPhotos(params.id);
  const iconPhoto = approvedPhotos[0] || null;
  const galleryPhotos = approvedPhotos.slice(1);

  return (
    <div>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <Link href={"/shop/" + cast.shops.slug} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--text-muted)", fontSize: 13, marginBottom: 20,
          border: "1px solid var(--border)", padding: "5px 14px", borderRadius: 20,
        }}>← {cast.shops.name}に戻る</Link>

        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 28, textAlign: "center", marginBottom: 20,
        }}>
          {/* アイコン（1枚目の写真 or デフォルト） */}
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, margin: "0 auto 16px", overflow: "hidden",
            border: "2px solid var(--accent)44",
          }}>
            {iconPhoto
              ? <img src={iconPhoto} alt={cast.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "👩"}
          </div>

          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>{cast.shops.name}</div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{cast.name}</h1>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{cast.age}歳</span>
            {cast.birthplace && (
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>📍 {cast.birthplace}出身</span>
            )}
          </div>

          {cast.on_today !== null && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 16px", borderRadius: 20,
              background: cast.on_today ? "var(--online-bg)" : "var(--bg-input)",
              border: "1px solid " + (cast.on_today ? "var(--online-border)" : "var(--border)"),
              fontSize: 13, color: cast.on_today ? "var(--online)" : "#ff4444",
              marginBottom: 20,
            }}>
              <span style={{
                display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                background: cast.on_today ? "var(--online)" : "#ff4444",
              }} />
              {cast.on_today ? "本日出勤" : "本日休み"}
            </div>
          )}

          <div style={{
            background: "var(--bg-input)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 20px",
            color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7,
            marginBottom: 20, fontStyle: "italic",
          }}>
            "{cast.comment}"
          </div>

          {/* SNSリンク */}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {cast.instagram && (
              <a href={"https://instagram.com/" + cast.instagram} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                  color: "#fff", padding: "8px 18px", borderRadius: 25,
                  fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
            )}
            {cast.x_account && (
              <a href={"https://x.com/" + cast.x_account} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#111", color: "#fff", padding: "8px 18px", borderRadius: 25,
                  fontSize: 13, fontWeight: 700, textDecoration: "none", border: "1px solid #333",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.95-5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X
              </a>
            )}
            {cast.tiktok_account && (
              <a href={"https://tiktok.com/@" + cast.tiktok_account} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#010101", color: "#fff", padding: "8px 18px", borderRadius: 25,
                  fontSize: 13, fontWeight: 700, textDecoration: "none", border: "1px solid #333",
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.56V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>
                TikTok
              </a>
            )}
          </div>
        </div>

        {/* 写真ギャラリー（2枚目以降をスワイプ） */}
        {galleryPhotos.length > 0 && (
          <CastPhotoSwiper photos={galleryPhotos} castName={cast.name} />
        )}
      </main>
    </div>
  );
}
