"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { canUseJobs } from "@/lib/plan";

type Job = { id: string; title: string; description: string | null; hourly_wage_min: number | null; hourly_wage_max: number | null; work_days: string | null; requirements: string | null; benefits: string | null; is_active: boolean; created_at: string };

type Props = {
  shopId: string;
  shopPlan: string;
  shopSlug: string;
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  btnPrimary: React.CSSProperties;
};

const taStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border-hover)", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "var(--font)", resize: "vertical", minHeight: 80, boxSizing: "border-box" };

export default function JobsTab({ shopId, shopPlan, shopSlug, sectionStyle, inputStyle, labelStyle, btnPrimary }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editJob, setEditJob] = useState<Partial<Job> | null>(null);
  const isGold = canUseJobs(shopPlan); // プレミアム・プロ・ゴールドのみ

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch(`/api/job-postings?shop_id=${shopId}`);
    if (res.ok) setJobs(await res.json());
  };

  const save = async () => {
    if (!editJob?.title) { setMsg("タイトルは必須です"); return; }
    setLoading(true); setMsg("");
    const method = editJob.id ? "PUT" : "POST";
    const body = editJob.id ? editJob : { ...editJob, shop_id: shopId };
    const res = await fetch("/api/job-postings", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setMsg("保存しました"); setEditJob(null); await load(); }
    else setMsg("保存に失敗しました");
    setLoading(false);
  };

  const deleteJob = async (id: string) => {
    if (!confirm("この求人を削除しますか？")) return;
    await fetch("/api/job-postings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  };

  const toggleActive = async (job: Job) => {
    await fetch("/api/job-postings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id, is_active: !job.is_active }) });
    await load();
  };

  // ゴールド未満の場合は案内のみ
  if (!isGold) {
    return (
      <div style={sectionStyle}>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💎</div>
          <h3 style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>求人掲載はゴールドプランから</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 20 }}>
            求人情報の掲載はゴールドプラン（月額3,000円）以上でご利用いただけます。<br/>
            求人ページを公開して、スタッフ募集を効果的にアピールしましょう。
          </p>
          <a href="mailto:info@night-vision.jp?subject=プランアップグレード希望" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 20, background: "linear-gradient(135deg,var(--accent),var(--accent2))", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            プランをアップグレードする
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            求人ページURL: <Link href={`/shop/${shopSlug}/jobs`} target="_blank" style={{ color: "var(--accent)" }}>night-vision.jp/shop/{shopSlug}/jobs</Link>
          </div>
        </div>
        <button onClick={() => setEditJob({ title: "", description: "", hourly_wage_min: undefined, hourly_wage_max: undefined, work_days: "", requirements: "", benefits: "" })} style={{ ...btnPrimary as any, padding: "8px 16px" }}>
          ＋ 求人を追加
        </button>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: msg.includes("失敗") ? "#ff444418" : "var(--online-bg)", border: `1px solid ${msg.includes("失敗") ? "#ff444444" : "var(--online-border)"}`, color: msg.includes("失敗") ? "#ff4444" : "var(--online)" }}>{msg}</div>}

      {/* 編集フォーム */}
      {editJob && (
        <div style={{ ...sectionStyle, marginBottom: 20, borderColor: "var(--accent)44" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 14 }}>{editJob.id ? "求人を編集" : "新しい求人"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={labelStyle}>タイトル *</label><input value={editJob.title ?? ""} onChange={e => setEditJob(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="例：ホステス・キャスト募集" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={labelStyle}>時給（下限）</label><input type="number" value={editJob.hourly_wage_min ?? ""} onChange={e => setEditJob(p => ({ ...p, hourly_wage_min: e.target.value ? Number(e.target.value) : undefined }))} style={inputStyle} placeholder="例：1500" /></div>
              <div><label style={labelStyle}>時給（上限）</label><input type="number" value={editJob.hourly_wage_max ?? ""} onChange={e => setEditJob(p => ({ ...p, hourly_wage_max: e.target.value ? Number(e.target.value) : undefined }))} style={inputStyle} placeholder="例：3000" /></div>
            </div>
            <div><label style={labelStyle}>勤務日程</label><input value={editJob.work_days ?? ""} onChange={e => setEditJob(p => ({ ...p, work_days: e.target.value }))} style={inputStyle} placeholder="例：週2〜OK、シフト自由" /></div>
            <div><label style={labelStyle}>仕事内容</label><textarea value={editJob.description ?? ""} onChange={e => setEditJob(p => ({ ...p, description: e.target.value }))} style={taStyle} placeholder="接客・会話・ドリンクサービスなど" /></div>
            <div><label style={labelStyle}>応募資格・条件</label><textarea value={editJob.requirements ?? ""} onChange={e => setEditJob(p => ({ ...p, requirements: e.target.value }))} style={{ ...taStyle, minHeight: 60 }} placeholder="未経験歓迎、年齢不問など" /></div>
            <div><label style={labelStyle}>待遇・福利厚生</label><textarea value={editJob.benefits ?? ""} onChange={e => setEditJob(p => ({ ...p, benefits: e.target.value }))} style={{ ...taStyle, minHeight: 60 }} placeholder="日払い可、交通費支給など" /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={save} disabled={loading} style={{ ...btnPrimary as any, flex: 1 }}>{loading ? "保存中..." : "保存"}</button>
            <button onClick={() => setEditJob(null)} style={{ padding: "10px 20px", borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 求人一覧 */}
      {jobs.length === 0 ? (
        <div style={{ ...sectionStyle, textAlign: "center", color: "var(--text-muted)", padding: "40px 16px" }}>
          求人が登録されていません。「求人を追加」ボタンから登録してください。
        </div>
      ) : jobs.map(job => (
        <div key={job.id} style={{ ...sectionStyle, marginBottom: 12, opacity: job.is_active ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{job.title}</div>
              {(job.hourly_wage_min || job.hourly_wage_max) && (
                <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
                  ¥{job.hourly_wage_min?.toLocaleString()}{job.hourly_wage_max ? `〜¥${job.hourly_wage_max.toLocaleString()}` : "〜"}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{new Date(job.created_at).toLocaleDateString("ja-JP")} 掲載</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: job.is_active ? "var(--online-bg)" : "var(--bg-input)", color: job.is_active ? "var(--online)" : "var(--text-muted)", border: `1px solid ${job.is_active ? "var(--online-border)" : "var(--border)"}` }}>
                {job.is_active ? "掲載中" : "非表示"}
              </span>
              <button onClick={() => toggleActive(job)} style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>{job.is_active ? "非表示" : "掲載"}</button>
              <button onClick={() => setEditJob(job)} style={{ padding: "4px 10px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>編集</button>
              <button onClick={() => deleteJob(job.id)} style={{ padding: "4px 10px", borderRadius: 6, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 11, cursor: "pointer" }}>削除</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
