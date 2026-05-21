"use client";
import { useState, useEffect, useRef } from "react";

type PhotoRequest = { id: string; url: string; status: string; sort_order: number; reject_reason: string | null };

const MAX_PHOTOS = 5;

export default function CastPhotosPanel({ castId, shopId }: { castId: string; shopId: string }) {
  const [photos, setPhotos] = useState<PhotoRequest[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    // photo_requestsからcast_idで取得
    const res = await fetch(`/api/cast-photos?cast_id=${castId}`);
    if (res.ok) setPhotos(await res.json());
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const approved = photos.filter(p => p.status === "approved").length;
    const pending = photos.filter(p => p.status === "pending").length;
    if (approved + pending >= MAX_PHOTOS) { setMsg(`写真は最大${MAX_PHOTOS}枚までです`); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("5MB以下の画像を選択してください"); return; }

    setUploading(true); setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("cast_id", castId);
    formData.append("shop_id", shopId);

    const res = await fetch("/api/cast-photos", { method: "POST", body: formData });
    if (res.ok) { setMsg("写真を送信しました。管理者の審査後に掲載されます。"); await load(); }
    else { const d = await res.json(); setMsg(d.error || "アップロードに失敗しました"); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この写真申請を削除しますか？")) return;
    const res = await fetch("/api/cast-photos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setMsg("削除しました"); await load(); }
  };

  const statusLabel = (s: string) => s === "approved" ? "掲載中" : s === "rejected" ? "非承認" : "審査中";
  const statusColor = (s: string) => s === "approved" ? "var(--online)" : s === "rejected" ? "#ff4444" : "var(--text-muted)";
  const statusBg = (s: string) => s === "approved" ? "var(--online-bg)" : s === "rejected" ? "#ff444418" : "var(--bg-input)";

  return (
    <div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>📷 プロフィール写真</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.8 }}>
          最大{MAX_PHOTOS}枚まで申請できます。審査後にキャストプロフィールページに掲載されます。<br/>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>1枚目がアイコン、2枚目以降はギャラリーに表示されます。</span>
        </p>

        {/* 写真一覧 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {photos.map((photo, i) => (
            <div key={photo.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 10,
              background: "var(--bg-input)", border: "1px solid var(--border)",
            }}>
              <img src={photo.url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{i + 1}枚目{i === 0 ? "（アイコン）" : ""}</div>
                {photo.reject_reason && (
                  <div style={{ fontSize: 11, color: "#ff4444", marginTop: 2 }}>非承認理由: {photo.reject_reason}</div>
                )}
              </div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 8,
                background: statusBg(photo.status), color: statusColor(photo.status),
                border: `1px solid ${statusColor(photo.status)}44`,
              }}>{statusLabel(photo.status)}</span>
              {photo.status !== "approved" && (
                <button onClick={() => handleDelete(photo.id)} style={{
                  background: "#ff444418", border: "1px solid #ff444444",
                  color: "#ff4444", padding: "3px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                }}>削除</button>
              )}
            </div>
          ))}
          {photos.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-hint)", textAlign: "center", padding: "16px 0" }}>写真がまだありません</p>
          )}
        </div>

        {/* アップロードボタン */}
        {photos.filter(p => p.status !== "rejected").length < MAX_PHOTOS && (
          <button onClick={() => inputRef.current?.click()} disabled={uploading} style={{
            padding: "10px 20px", borderRadius: 10, cursor: "pointer",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            border: "none", color: "#fff", fontSize: 13, fontWeight: 700,
            fontFamily: "var(--font)", opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? "送信中..." : "📷 写真を追加する"}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 8 }}>
          {photos.filter(p=>p.status!=="rejected").length}/{MAX_PHOTOS}枚 · 5MB以下のJPG/PNG/WebP
        </div>
      </div>

      {msg && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff444444" : "var(--online-border)"}`,
          color: msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff4444" : "var(--online)",
        }}>{msg}</div>
      )}
    </div>
  );
}
