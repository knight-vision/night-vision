"use client";
import { useState, useEffect, useCallback } from "react";

type SlipItem = { name: string; qty: number; price: number };
type SlipCast = { cast_id: string; type: string };
type Slip = {
  id: string; date: string; payment: string;
  subtotal: number; tax: number; total: number;
  items: SlipItem[]; cast_entries: SlipCast[]; memo: string | null;
};

type Cast = { id: number; name: string };

type Props = {
  shopId: string;
  casts: Cast[];
  sectionStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
};

const today = new Date().toISOString().slice(0, 10);
const thisMonth = today.slice(0, 7);

export default function CastSlipsTab({ shopId, casts, sectionStyle, inputStyle, labelStyle }: Props) {
  const [selectedCastId, setSelectedCastId] = useState<string>(casts[0] ? String(casts[0].id) : "");
  const [month, setMonth] = useState(thisMonth);
  const [slips, setSlips] = useState<Slip[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCastId) return;
    setLoading(true);
    const res = await fetch(`/api/slips?shop_id=${shopId}&month=${month}&cast_id=${selectedCastId}`);
    const data = await res.json();
    setSlips(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [shopId, selectedCastId, month]);

  useEffect(() => { load(); }, [load]);

  const cast = casts.find(c => String(c.id) === selectedCastId);

  // この月の合計
  const totalAmount = slips.reduce((s, slip) => s + (slip.total || 0), 0);
  const totalCount = slips.length;

  return (
    <div>
      {/* キャスト選択 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={labelStyle}>キャスト</label>
          <select value={selectedCastId} onChange={e => setSelectedCastId(e.target.value)} style={inputStyle}>
            {casts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>月</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0, 7)); }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>←</button>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", minWidth: 80, textAlign: "center" }}>{month.replace("-", "年")}月</span>
            <button onClick={() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0, 7)); }}
              style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}>→</button>
          </div>
        </div>
      </div>

      {/* サマリー */}
      {cast && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { label: "担当伝票数", value: totalCount, unit: "枚" },
            { label: "売上合計", value: `¥${totalAmount.toLocaleString()}`, unit: "" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)" }}>{s.value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>{s.unit}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* 伝票一覧 */}
      {loading
        ? <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>読み込み中...</div>
        : slips.length === 0
          ? <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32, fontSize: 14 }}>この期間の伝票はありません</div>
          : slips.map(slip => {
            const isOpen = expanded === slip.id;
            // このキャストの役割
            const myEntry = slip.cast_entries?.find(e => String(e.cast_id) === selectedCastId);
            return (
              <div key={slip.id} style={{ ...sectionStyle, marginBottom: 10 }}>
                {/* ヘッダー行 */}
                <div
                  onClick={() => setExpanded(isOpen ? null : slip.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {(() => { const d = new Date(slip.date + "T00:00:00"); return `${d.getMonth()+1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`; })()}
                      </span>
                      {myEntry && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--accent)22", color: "var(--accent)", fontWeight: 700 }}>
                          {myEntry.type}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 8px", borderRadius: 8, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
                        {slip.payment}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {slip.items?.slice(0, 3).map(i => i.name).join(" · ")}
                      {(slip.items?.length || 0) > 3 && ` ...他${(slip.items?.length || 0) - 3}品`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>¥{(slip.total || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{isOpen ? "▲ 閉じる" : "▼ 詳細"}</div>
                  </div>
                </div>

                {/* 詳細展開 */}
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    {/* 品目 */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>品目</div>
                      {slip.items?.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "var(--text-secondary)" }}>
                          <span>{item.name} × {item.qty}</span>
                          <span>¥{(item.qty * item.price).toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", paddingTop: 6, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                        <span>小計</span><span>¥{(slip.subtotal || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        <span>消費税</span><span>¥{(slip.tax || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6, borderTop: "1px solid var(--border)", marginTop: 4 }}>
                        <span>合計</span><span>¥{(slip.total || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 担当キャスト全員 */}
                    {slip.cast_entries?.filter(e => e.cast_id).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>担当キャスト</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {slip.cast_entries.filter(e => e.cast_id).map((e, i) => {
                            const c = casts.find(c => String(c.id) === String(e.cast_id));
                            const isMe = String(e.cast_id) === selectedCastId;
                            return (
                              <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 10, background: isMe ? "var(--accent)22" : "var(--bg-input)", border: `1px solid ${isMe ? "var(--accent)44" : "var(--border)"}`, color: isMe ? "var(--accent)" : "var(--text-secondary)", fontWeight: isMe ? 700 : 400 }}>
                                {c?.name || "不明"} ({e.type})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {slip.memo && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>📝 {slip.memo}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
      }
    </div>
  );
}
