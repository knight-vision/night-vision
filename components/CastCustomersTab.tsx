"use client";
import { useState, useEffect, useCallback } from "react";

type Customer = { id: string; name: string; memo: string; visit_count: number; visit_date: string; slip_id: string | null; created_at: string };

type Props = { shopId: number; castId: number };

export default function CastCustomersTab({ shopId, castId }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // 新規追加
  const [addName, setAddName] = useState("");
  const [addMemo, setAddMemo] = useState("");
  const [addVisit, setAddVisit] = useState("1");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0,10));
  const [showAdd, setShowAdd] = useState(false);

  // 編集
  const [editId, setEditId] = useState<string|null>(null);
  const [editName, setEditName] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editVisit, setEditVisit] = useState("1");

  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!shopId || !castId) return;
    setLoading(true);
    const res = await fetch(`/api/customers?shop_id=${shopId}&cast_id=${castId}`);
    const data = res.ok ? await res.json() : [];
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [shopId, castId]);

  useEffect(() => { load(); }, [load]);

  const addCustomer = async () => {
    if (!addName.trim() && !addMemo.trim()) return;
    await fetch("/api/customers", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ shop_id:shopId, cast_id:castId, name:addName.trim()||"名前なし", memo:addMemo.trim(), visit_count:Number(addVisit)||1, visit_date:addDate }) });
    setAddName(""); setAddMemo(""); setAddVisit("1"); setShowAdd(false);
    setMsg("✅ 追加しました"); setTimeout(()=>setMsg(""),2000);
    load();
  };

  const saveEdit = async () => {
    if (!editId) return;
    await fetch("/api/customers", { method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id:editId, name:editName, memo:editMemo, visit_count:Number(editVisit)||1 }) });
    setEditId(null);
    load();
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/customers", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id}) });
    load();
  };

  const filtered = customers.filter(c =>
    !search || c.name.includes(search) || (c.memo||"").includes(search)
  );

  const inp: React.CSSProperties = { width:"100%", padding:"10px 12px", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, color:"var(--text-primary)", fontSize:13, fontFamily:"var(--font)", boxSizing:"border-box" as const };
  const sec: React.CSSProperties = { background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:14, padding:14, marginBottom:10 };

  return (
    <div>
      {msg && <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:10, fontSize:13, background:"var(--online-bg)", border:"1px solid var(--online-border)", color:"var(--online)" }}>{msg}</div>}

      {/* 検索＋追加ボタン */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 お客様名・メモで検索"
          style={{ ...inp, flex:1 }} />
        <button onClick={()=>setShowAdd(v=>!v)} style={{ padding:"10px 16px", borderRadius:10, background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" as const }}>
          {showAdd?"キャンセル":"＋ 追加"}
        </button>
      </div>

      {/* 追加フォーム */}
      {showAdd && (
        <div style={{ ...sec, border:"1px solid var(--accent)44", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:12 }}>顧客を追加</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:8, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>お客様名</div>
              <input type="text" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="例：田中様" style={inp} />
            </div>
            <div>
              <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>来店回数</div>
              <input type="number" value={addVisit} onChange={e=>setAddVisit(e.target.value)} min={1} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>来店日</div>
            <input type="date" value={addDate} onChange={e=>setAddDate(e.target.value)} style={inp} />
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>メモ</div>
            <textarea value={addMemo} onChange={e=>setAddMemo(e.target.value)}
              placeholder="好きなお酒、誕生日、来店のきっかけなど"
              rows={3} style={{ ...inp, resize:"vertical" as const }} />
          </div>
          <button onClick={addCustomer} style={{ width:"100%", padding:"10px", borderRadius:10, background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font)" }}>保存</button>
        </div>
      )}

      {/* 件数 */}
      <div style={{ fontSize:12, color:"var(--text-muted)", marginBottom:10 }}>
        {filtered.length}件{search ? ` / 全${customers.length}件` : ""}
      </div>

      {loading ? <div style={{ textAlign:"center" as const, color:"var(--text-muted)", padding:24 }}>読み込み中...</div>
        : filtered.length === 0 ? <div style={{ ...sec, color:"var(--text-hint)", fontSize:13, textAlign:"center" as const }}>顧客が登録されていません</div>
        : filtered.map(c => (
          <div key={c.id} style={sec}>
            {editId === c.id ? (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 80px", gap:8, marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>お客様名</div>
                    <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>来店回数</div>
                    <input type="number" value={editVisit} onChange={e=>setEditVisit(e.target.value)} min={1} style={inp} />
                  </div>
                </div>
                <textarea value={editMemo} onChange={e=>setEditMemo(e.target.value)} rows={3} style={{ ...inp, resize:"vertical" as const, marginBottom:8 }} />
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={saveEdit} style={{ flex:1, padding:"8px", borderRadius:8, background:"var(--accent)", border:"none", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:700 }}>保存</button>
                  <button onClick={()=>setEditId(null)} style={{ flex:1, padding:"8px", borderRadius:8, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-muted)", fontSize:12, cursor:"pointer" }}>キャンセル</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:14, fontWeight:700, color:"var(--text-primary)" }}>{c.name||"名前なし"}</span>
                    <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>来店{c.visit_count}回目</span>
                    {c.visit_date && <span style={{ fontSize:11, color:"var(--text-muted)", marginLeft:8 }}>{c.visit_date}</span>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ setEditId(c.id); setEditName(c.name); setEditMemo(c.memo||""); setEditVisit(String(c.visit_count)); }}
                      style={{ fontSize:11, padding:"3px 10px", borderRadius:6, background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--text-muted)", cursor:"pointer" }}>編集</button>
                    <button onClick={()=>deleteCustomer(c.id)}
                      style={{ fontSize:11, padding:"3px 10px", borderRadius:6, background:"#ff444418", border:"1px solid #ff444444", color:"#ff4444", cursor:"pointer" }}>削除</button>
                  </div>
                </div>
                {c.memo && <div style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.7, whiteSpace:"pre-wrap" as const }}>{c.memo}</div>}
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}
