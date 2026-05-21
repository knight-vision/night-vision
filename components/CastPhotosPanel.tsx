"use client";
import { useState, useEffect, useRef } from "react";

const MAX_PHOTOS = 5;

export default function CastPhotosPanel({ castId }: { castId: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await fetch(`/api/cast-photos?cast_id=${castId}`);
    if (res.ok) {
      const d = await res.json();
      // photosはcastのカラムから取得
      const castRes = await fetch(`/api/cast-photos?cast_id=${castId}`);
    }
    // castデータからphotosを取得
    const r = await fetch(`/api/cast-photos?cast_id=${castId}`);
  };

  useEffect(() => {
    // キャストデータから直接取得
    const fetchPhotos = async () => {
      const res = await fetch(`/api/cast-allowances?cast_id=${castId}`); // 別のエンドポイントを利用
      // 実際はSupabaseから直接キャストのphotosを取得
    };

    // Supabaseクライアントで直接取得
    const getPhotos = async () => {
      try {
        const res = await fetch(`/api/cast-photos?cast_id=${castId}&action=get`);
        if (res.ok) {
          const d = await res.json();
          setPhotos(d.photos || []);
        }
      } catch {}
    };
    getPhotos();
  }, [castId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) { setMsg(`写真は最大${MAX_PHOTOS}枚までです`); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("5MB以下の画像を選択してください"); return; }

    setUploading(true); setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("cast_id", castId);

    const res = await fetch("/api/cast-photos", { method: "POST", body: formData });
    if (res.ok) {
      const d = await res.json();
      setPhotos(d.photos || []);
      setMsg("写真をアップロードしました");
    } else {
      const d = await res.json();
      setMsg(d.error || "アップロードに失敗しました");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (url: string) => {
    if (!confirm("この写真を削除しますか？")) return;
    const res = await fetch("/api/cast-photos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cast_id: castId, url }),
    });
    if (res.ok) {
      const d = await res.json();
      setPhotos(d.photos || []);
      setMsg("削除しました");
    }
  };

  return (
    <div>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>📷 プロフィール写真</div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.8 }}>
          最大{MAX_PHOTOS}枚まで登録できます。店舗ページのキャストプロフィールに表示されます。
        </p>

        {/* 写真グリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "var(--bg-input)" }}>
              <img src={url} alt={`写真${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => handleDelete(url)}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 24, height: 24, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ aspectRatio: "1", borderRadius: 10, background: "var(--bg-input)", border: "2px dashed var(--border)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--text-muted)", fontSize: 12 }}
            >
              <span style={{ fontSize: 24 }}>＋</span>
              <span>{uploading ? "アップロード中" : "追加"}</span>
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        <div style={{ fontSize: 11, color: "var(--text-hint)" }}>{photos.length}/{MAX_PHOTOS}枚 · 5MB以下のJPG/PNG/WebP</div>
      </div>

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13,
          background: msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff444418" : "var(--online-bg)",
          border: `1px solid ${msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff444444" : "var(--online-border)"}`,
          color: msg.includes("失敗") || msg.includes("以下") || msg.includes("まで") ? "#ff4444" : "var(--online)",
        }}>{msg}</div>
      )}
    </div>
  );
}
