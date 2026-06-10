"use client";
import { useState, useEffect, useRef } from "react";
import { compressImage } from "@/lib/compressImage";

type Photo = { id: string; url: string; status: string; sort_order: number; reject_reason?: string | null };

const MAX_PHOTOS = 5;

// 店舗管理者用のキャスト写真管理（アップロード申請・削除・並び替え）
// キャスト側のCastPhotosPanelと同じcast-photos APIを使う
export default function CastPhotoManager({ castId, shopId }: { castId: number; shopId?: string | number }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [castId]);

  const load = async () => {
    const res = await fetch(`/api/cast-photos?cast_id=${castId}`);
    if (res.ok) setPhotos(await res.json());
  };

  // ファイル選択 → 圧縮 → プレビュー
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const active = photos.filter(p => p.status !== "rejected").length;
    if (active >= MAX_PHOTOS) { setMsg(`写真は最大${MAX_PHOTOS}枚までです`); return; }
    if (file.size > 20 * 1024 * 1024) { setMsg("20MB以下の画像を選択してください"); return; }
    setMsg("");
    let f = file;
    try {
      f = await compressImage(file); // 大きい画像は自動でリサイズ・圧縮
    } catch { /* 圧縮失敗時は元ファイルを使う */ }
    setPendingFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // アップロード（申請）
  const handleSubmit = async () => {
    if (!pendingFile) return;
    setUploading(true); setMsg("");
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("cast_id", String(castId));
    if (shopId != null) formData.append("shop_id", String(shopId));
    const res = await fetch("/api/cast-photos", { method: "POST", body: formData });
    if (res.ok) {
      setMsg("写真を設定しました");
      setPendingFile(null); setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error || "アップロードに失敗しました");
    }
    setUploading(false);
  };

  const handleCancel = () => {
    setPendingFile(null); setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    setMsg("");
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
    const newPhotos = [...approved];
    const target = index + dir;
    if (target < 0 || target >= newPhotos.length) return;
    [newPhotos[index], newPhotos[target]] = [newPhotos[target], newPhotos[index]];
    await persistOrder(newPhotos);
  };

  // 並び順をまとめて保存
  const persistOrder = async (ordered: Photo[]) => {
    setLoading(true);
    for (let i = 0; i < ordered.length; i++) {
      await fetch("/api/cast-photos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ordered[i].id, sort_order: i }),
      });
    }
    await load();
    setLoading(false);
    setMsg("順番を変更しました");
  };

  // ドラッグ並び替え
  const dragIndex = useRef<number | null>(null);
  const handleDrop = async (dropIndex: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === dropIndex) return;
    const newPhotos = [...approved];
    const [moved] = newPhotos.splice(from, 1);
    newPhotos.splice(dropIndex, 0, moved);
    await persistOrder(newPhotos);
  };

  const approved = photos.filter(p => p.status === "approved");
  const pending = photos.filter(p => p.status === "pending");
  const rejected = photos.filter(p => p.status === "rejected");
  const activeCount = photos.filter(p => p.status !== "rejected").length;

  return (
    <div style={{ background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 4, letterSpacing: "0.1em" }}>📷 プロフィール写真</div>
      <div style={{ fontSize: 11, color: "var(--text-hint)", marginBottom: 12 }}>最大{MAX_PHOTOS}枚まで設定できます。設定するとすぐに反映されます。</div>

      {/* 5枠ガイド: 埋まっている枠は写真、空き枠は空枠表示 */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${MAX_PHOTOS}, 1fr)`, gap: 6, marginBottom: 14 }}>
        {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
          const slotPhoto = [...approved, ...pending][i];
          if (slotPhoto) {
            return (
              <div key={i} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                <img src={slotPhoto.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: slotPhoto.status === "pending" ? 0.55 : 1 }} />
                {slotPhoto.status === "pending" && <div style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#f59e0b" }}>審査中</div>}
                {i === 0 && slotPhoto.status === "approved" && <div style={{ position: "absolute", top: 2, left: 2, fontSize: 9, background: "rgba(0,0,0,0.5)", color: "#fff", padding: "1px 4px", borderRadius: 4 }}>1枚目</div>}
              </div>
            );
          }
          return (
            <label key={i} style={{ aspectRatio: "3/4", borderRadius: 8, border: "1.5px dashed var(--border)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-hint)", fontSize: 22, cursor: activeCount < MAX_PHOTOS ? "pointer" : "default" }}>
              {activeCount < MAX_PHOTOS ? "＋" : ""}
              {activeCount < MAX_PHOTOS && <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />}
            </label>
          );
        })}
      </div>

      {/* アップロード */}
      {activeCount < MAX_PHOTOS && (
        <div style={{ marginBottom: 14 }}>
          {!preview ? (
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 10, border: "1px dashed var(--border)", color: "var(--accent)", fontSize: 13, cursor: "pointer", background: "transparent" }}>
              ＋ 写真を選択
              <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
            </label>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <img src={preview} alt="プレビュー" style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 10 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSubmit} disabled={uploading} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)", opacity: uploading ? 0.6 : 1 }}>{uploading ? "設定中..." : "この写真を設定する"}</button>
                <button onClick={handleCancel} disabled={uploading} style={{ padding: "10px 16px", borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font)" }}>取消</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 承認済み（掲載中）: 並び替え可能 */}
      {approved.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--online)", marginBottom: 6 }}>✅ 掲載中（{approved.length}枚）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {approved.map((photo, i) => (
              <div key={photo.id}
                draggable
                onDragStart={() => { dragIndex.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--bg-card)", borderRadius: 8, cursor: "grab" }}>
                <span style={{ color: "var(--text-hint)", fontSize: 16, cursor: "grab", flexShrink: 0 }} title="ドラッグで並び替え">⠿</span>
                <img src={photo.url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", flex: 1 }}>{i === 0 ? "🎭 1枚目（店舗一覧の表示用）" : `${i + 1}枚目`}</span>
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
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 6 }}>⏳ 審査中（{pending.length}枚）</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {pending.map(photo => (
              <div key={photo.id} style={{ position: "relative" }}>
                <img src={photo.url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, opacity: 0.7, border: "1px solid #f59e0b44" }} />
                <button onClick={() => deletePhoto(photo.id)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ff4444", border: "none", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 非承認 */}
      {rejected.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#ff4444", marginBottom: 6 }}>❌ 非承認（{rejected.length}枚）</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {rejected.map(photo => (
              <div key={photo.id} style={{ position: "relative" }}>
                <img src={photo.url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, opacity: 0.4, border: "1px solid #ff444444" }} />
                <button onClick={() => deletePhoto(photo.id)} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ff4444", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && <div style={{ fontSize: 11, color: "var(--online)", marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
