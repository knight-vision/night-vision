"use client";
import { useState, useEffect, useRef } from "react";

type PhotoRequest = { id: string; url: string; status: string; sort_order: number; reject_reason: string | null };

const MAX_PHOTOS = 5;

export default function CastPhotosPanel({ castId, shopId }: { castId: string; shopId: string }) {
  const [photos, setPhotos] = useState<PhotoRequest[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch(`/api/cast-photos?cast_id=${castId}`);
    if (res.ok) setPhotos(await res.json());
  };

  // ファイル選択時はプレビューのみ（送信しない）
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const active = photos.filter(p => p.status !== "rejected").length;
    if (active >= MAX_PHOTOS) { setMsg(`写真は最大${MAX_PHOTOS}枚までです`); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("5MB以下の画像を選択してください"); return; }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    setMsg("");
  };

  // 手動送信ボタンを押したときにアップロード
  const handleSubmit = async () => {
    if (!pendingFile) return;
    setUploading(true); setMsg("");
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("cast_id", castId);
    formData.append("shop_id", shopId);

    const res = await fetch("/api/cast-photos", { method: "POST", body: formData });
    if (res.ok) {
      setMsg("写真を申請しました。管理者の審査後に掲載されます。");
      setPendingFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } else {
      const d = await res.json();
      setMsg(d.error || "アップロードに失敗しました");
    }
    setUploading(false);
  };

  const handleCancel = () => {
    setPendingFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    setMsg("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この写真申請を削除しますか？")) return;
    const res = await fetch("/api/cast-photos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setMsg("削除しました"); await load(); }
  };

  const statusLabel = (s: string) => ({ approved: "✅ 掲載中", rejected: "❌ 非承認", pending: "⏳ 審査中" }[s] || s);
  const statusColor = (s: string) => ({ approved: "var(--online)", rejected: "#ff4444", pending: "#f59e0b" }[s] || "var(--text-muted)");
  const statusBg = (s: string) => ({ approved: "var(--online-bg)", rejected: "#ff444418", pending: "#f59e0b18" }[s] || "var(--bg-input)");
  const statusBorder = (s: string) => ({ approved: "var(--online-border)", rejected: "#ff444444", pending: "#f59e0b44" }[s] || "var(--border)");

  const isError = (m: string) => m.includes("失敗") || m.includes("以下") || m.includes("まで");

  return (
    <div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>📷 プロフィール写真</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.8 }}>
          最大{MAX_PHOTOS}枚まで申請できます。審査後にキャストプロフィールページに掲載されます。<br/>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>1枚目がアイコン、2枚目以降はギャラリーに表示されます。</span>
        </p>

        {/* 写真一覧 */}
        {photos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {photos.map((photo, i) => (
              <div key={photo.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10,
                background: statusBg(photo.status),
                border: `1px solid ${statusBorder(photo.status)}`,
              }}>
                <img src={photo.url} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
                    {i + 1}枚目{i === 0 ? "（アイコン）" : ""}
                  </div>
                  <span style={{
                    display: "inline-block", fontSize: 11, fontWeight: 700,
                    color: statusColor(photo.status),
                  }}>{statusLabel(photo.status)}</span>
                  {photo.status === "pending" && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 2 }}>審査中です。しばらくお待ちください。</div>
                  )}
                  {photo.reject_reason && (
                    <div style={{ fontSize: 11, color: "#ff4444", marginTop: 2 }}>非承認理由: {photo.reject_reason}</div>
                  )}
                </div>
                <button onClick={() => handleDelete(photo.id)} style={{
                  background: "#ff444418", border: "1px solid #ff444444",
                  color: "#ff4444", padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", flexShrink: 0,
                }}>{photo.status === "approved" ? "削除" : "取り消し"}</button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && !preview && (
          <p style={{ fontSize: 13, color: "var(--text-hint)", textAlign: "center", padding: "16px 0", marginBottom: 12 }}>写真がまだありません</p>
        )}

        {/* プレビュー（選択後・送信前） */}
        {preview && pendingFile && (
          <div style={{
            background: "var(--bg-input)", border: "2px dashed var(--accent)66",
            borderRadius: 12, padding: 16, marginBottom: 14,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>📎 選択中の写真（まだ送信されていません）</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img src={preview} alt="プレビュー" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>{pendingFile.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{(pendingFile.size / 1024 / 1024).toFixed(1)}MB</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={handleSubmit} disabled={uploading} style={{
                flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 800,
                fontFamily: "var(--font)", opacity: uploading ? 0.6 : 1,
              }}>
                {uploading ? "送信中..." : "📤 この写真を申請する"}
              </button>
              <button onClick={handleCancel} style={{
                padding: "10px 16px", borderRadius: 10, cursor: "pointer",
                background: "var(--bg-input)", border: "1px solid var(--border)",
                color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font)",
              }}>キャンセル</button>
            </div>
          </div>
        )}

        {/* 追加ボタン（プレビュー中は非表示） */}
        {!preview && photos.filter(p => p.status !== "rejected").length < MAX_PHOTOS && (
          <button onClick={() => inputRef.current?.click()} style={{
            padding: "10px 20px", borderRadius: 10, cursor: "pointer",
            background: "var(--bg-input)", border: "2px dashed var(--border)",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 700,
            fontFamily: "var(--font)",
          }}>
            📷 写真を選択する
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
        <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 8 }}>
          {photos.filter(p => p.status !== "rejected").length}/{MAX_PHOTOS}枚 · 5MB以下のJPG/PNG/WebP
        </div>
      </div>

      {msg && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: isError(msg) ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${isError(msg) ? "#ff444444" : "var(--online-border)"}`,
          color: isError(msg) ? "#ff4444" : "var(--online)",
        }}>{msg}</div>
      )}
    </div>
  );
}
