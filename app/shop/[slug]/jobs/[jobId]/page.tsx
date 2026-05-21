import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string; jobId: string } }): Promise<Metadata> {
  const { data: job } = await supabase.from("job_postings").select("title, shops(name)").eq("id", params.jobId).single();
  if (!job) return {};
  return { title: `${job.title} ｜ ${(job.shops as any)?.name} 求人` };
}

export default async function JobDetailPage({ params }: { params: { slug: string; jobId: string } }) {
  const { data: shop } = await supabase.from("shops").select("id, name, slug, type").eq("slug", params.slug).single();
  if (!shop) notFound();

  const { data: job } = await supabase.from("job_postings").select("*").eq("id", params.jobId).eq("shop_id", shop.id).single();
  if (!job) notFound();

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 16, padding: "14px 16px", marginBottom: 12,
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <Link href={`/shop/${shop.slug}`} style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", padding: "5px 14px", borderRadius: 20 }}>
            ← {shop.name}
          </Link>
          <Link href={`/shop/${shop.slug}/jobs`} style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", border: "1px solid var(--border)", padding: "5px 14px", borderRadius: 20 }}>
            求人一覧
          </Link>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{shop.name} · 求人情報</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginBottom: 16 }}>{job.title}</h1>

          {(job.hourly_wage_min || job.hourly_wage_max) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>時給</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>
                ¥{job.hourly_wage_min?.toLocaleString()}{job.hourly_wage_max ? `〜¥${job.hourly_wage_max.toLocaleString()}` : "〜"}
              </div>
            </div>
          )}

          {job.work_days && (
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>勤務日程</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{job.work_days}</div>
            </div>
          )}

          {job.description && (
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>仕事内容</div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{job.description}</p>
            </div>
          )}

          {job.requirements && (
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>応募資格・条件</div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{job.requirements}</p>
            </div>
          )}

          {job.benefits && (
            <div style={{ ...cardStyle }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>待遇・福利厚生</div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{job.benefits}</p>
            </div>
          )}

          <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--accent)11", border: "1px solid var(--accent)33", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>応募・お問い合わせ</div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.7 }}>
              ご応募はお店に直接お問い合わせください。
            </p>
            <Link href={`/shop/${shop.slug}`} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              color: "#fff", padding: "10px 22px", borderRadius: 25,
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              {shop.name}のページへ
            </Link>
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-hint)" }}>
            掲載日: {new Date(job.created_at).toLocaleDateString("ja-JP")}
          </div>
        </div>
      </main>
    </>
  );
}
