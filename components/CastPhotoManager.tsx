"use client";
import { useState, useEffect } from "react";

type Photo = { id: string; url: string; status: string; sort_order: number };

export default function CastPhotoManager({ castId }: { castId: number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { load(); }, [castId]);

  const load = async () => {
    const res = await fetch(`/api/cast-photos?cast_id=${castId}`);
    if (res.ok) setPhotos(await res.json());
  };

  const deletePhoto = async (id: string) => {
    if (!confirm("この写真を削除しますか？")) return;
    const res = await fetch("/api/cast-photos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setMsg("削除しました"); await load(); }
    else setMsg("削除に失敗しました");
  };

  const movePhoto = async (index: number, dir: -1 | 1) => {
    const newPhotos = [...photos];
    const target = index + dir;
    if (target < 0 || target >= newPhotos.length) return;
    [newPhotos[index], newPhotos[target]] = [newPhotos[target], newPhotos[index]];

    // sort_orderを更新
    setLoading(true);
    for (let i = 0; i < newPhotos.length; i++) {
      await fetch("/api/cast-photos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newPhotos[i].id, sort_order: i }),
      });
    }
    await load();
    setLoading(false);
    setMsg("順番を変更しました");
  };

  const approved = photos.filter(p => p.status === "approved");
  const pending = photos.filter(p => p.status === "pending");

  if (photos.length === 0) return null;

  return (
    <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, letterSpacing: "0.1em" }}>📷 プロフィール写真</div>

      {/* 承認済み写真 */}
      {approved.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--online)", marginBottom: 6 }}>✅ 掲載中（{approved.length}枚）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {approved.map((photo, i) => (
              <div key={photo.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--bg-card)", borderRadius: 8 }}>
                <img src={photo.url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>
                  {i === 0 ? "🎭 アイコン" : `${i + 1}枚目`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => movePhoto(i, -1)} disabled={i === 0 || loading} style={{ padding: "3px 8px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                  <button onClick={() => movePhoto(i, 1)} disabled={i === approved.length - 1 || loading} style={{ padding: "3px 8px", borderRadius: 6, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", opacity: i === approved.length - 1 ? 0.3 : 1 }}>↓</button>
                  <button onClick={() => deletePhoto(photo.id)} style={{ padding: "3px 8px", borderRadius: 6, background: "#ff444418", border: "1px solid #ff444444", color: "#ff4444", fontSize: 11, cursor: "pointer" }}>削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 審査中 */}
      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 6 }}>⏳ 審査中（{pending.length}枚）</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pending.map(photo => (
              <img key={photo.id} src={photo.url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, opacity: 0.6, border: "1px solid #f59e0b44" }} />
            ))}
          </div>
        </div>
      )}

      {msg && <div style={{ fontSize: 11, color: "var(--online)", marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
