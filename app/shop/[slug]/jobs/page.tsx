import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/shops";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: shop } = await supabase.from("shops").select("name, type").eq("slug", params.slug).single();
  if (!shop) return {};
  return { title: `求人情報 ｜ ${shop.name}`, description: `${shop.name}の求人・採用情報` };
}

export default async function ShopJobsPage({ params }: { params: { slug: string } }) {
  const { data: shop } = await supabase.from("shops").select("id, name, type, slug, plan").eq("slug", params.slug).single();
  if (!shop) notFound();

  const { data: jobs } = await supabase.from("job_postings").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false });

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: 16, padding: 24, marginBottom: 16,
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 60px" }}>
        <Link href={`/shop/${shop.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
          ← {shop.name}に戻る
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6 }}>
          求人情報
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>{shop.name} · {shop.type}</p>

        {!jobs || jobs.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
            現在、求人は掲載されていません
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>{job.title}</h2>
              {(job.hourly_wage_min || job.hourly_wage_max) && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8 }}>時給</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>
                    ¥{job.hourly_wage_min?.toLocaleString()}{job.hourly_wage_max ? `〜¥${job.hourly_wage_max.toLocaleString()}` : "〜"}
                  </span>
                </div>
              )}
              {job.work_days && (
                <div style={{ marginBottom: 8, fontSize: 14, color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--text-muted)", marginRight: 8 }}>勤務日</span>{job.work_days}
                </div>
              )}
              {job.description && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 12, whiteSpace: "pre-wrap" }}>{job.description}</p>
              )}
              {job.requirements && (
                <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>応募資格・条件</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{job.requirements}</p>
                </div>
              )}
              {job.benefits && (
                <div style={{ background: "var(--bg-input)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>待遇・福利厚生</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{job.benefits}</p>
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-hint)" }}>
                掲載日: {new Date(job.created_at).toLocaleDateString("ja-JP")}
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
