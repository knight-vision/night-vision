import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "釧路ナイトビジョン｜店舗オーナー様へ - 無料で集客・店舗管理を始める",
  description: "釧路の飲み屋・スナック・ガールズバー・ラウンジオーナー向け。無料で掲載・集客。シフト管理・給与計算・売上管理まで全部入り。",
  alternates: { canonical: "https://www.night-vision.jp/for-owners" },
};

export default function ForOwnersPage() {
  return (
    <div style={{
      background: "#08080f",
      minHeight: "100vh",
      fontFamily: "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif",
      color: "#e8e0f0",
      overflowX: "hidden",
    }}>

      {/* ナビ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,8,15,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(124,58,237,0.2)",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🦉</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#c4b5fd", letterSpacing: 3 }}>NIGHT VISION</span>
        </Link>
        <Link href="/join" style={{
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          color: "#fff", padding: "9px 22px", borderRadius: 25,
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          whiteSpace: "nowrap",
        }}>無料で始める</Link>
      </nav>

      {/* ヒーロー */}
      <section style={{
        position: "relative",
        padding: "80px 24px 80px",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* 背景グラデーション */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(219,39,119,0.12) 0%, transparent 50%)
          `,
        }} />

        <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            display: "inline-block",
            fontSize: 12, color: "#a78bfa",
            letterSpacing: 4, border: "1px solid rgba(167,139,250,0.35)",
            padding: "6px 20px", borderRadius: 20, marginBottom: 28,
            background: "rgba(124,58,237,0.1)",
          }}>店舗オーナー様へ</div>

          <h1 style={{
            fontSize: "clamp(36px, 10vw, 64px)",
            fontWeight: 900, lineHeight: 1.2,
            letterSpacing: "-0.03em", marginBottom: 24,
            color: "#fff",
          }}>
            釧路の夜を、<br />
            <span style={{
              background: "linear-gradient(135deg, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>もっと集客できる</span>
            <br />サービス
          </h1>

          <p style={{
            fontSize: "clamp(15px, 4vw, 18px)",
            color: "rgba(200,190,220,0.75)",
            lineHeight: 1.9, marginBottom: 40,
          }}>
            釧路特化の飲食店情報サイト。<br />
            掲載から売上管理・シフト管理まで<br />
            <strong style={{ color: "#e8e0f0" }}>全部まとめて、無料から始められます。</strong>
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/join" style={{
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              color: "#fff", padding: "15px 36px", borderRadius: 30,
              fontSize: 16, fontWeight: 800, textDecoration: "none",
              boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
            }}>🚀 無料で会員登録する</Link>
            <Link href="/" style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(167,139,250,0.3)",
              color: "#c4b5fd", padding: "15px 32px", borderRadius: 30,
              fontSize: 16, fontWeight: 700, textDecoration: "none",
            }}>サイトを見る →</Link>
          </div>
        </div>
      </section>

      {/* 実績バー */}
      <section style={{
        borderTop: "1px solid rgba(124,58,237,0.15)",
        borderBottom: "1px solid rgba(124,58,237,0.15)",
        background: "rgba(124,58,237,0.05)",
        padding: "28px 24px",
      }}>
        <div style={{
          maxWidth: 600, margin: "0 auto",
          display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16,
        }}>
          {[
            { value: "釧路", unit: "特化", label: "地域密着" },
            { value: "¥0", unit: "", label: "フリープラン" },
            { value: "24h", unit: "", label: "いつでも掲載" },
            { value: "5分", unit: "", label: "で登録完了" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 16 }}>{s.unit}</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(167,139,250,0.7)", marginTop: 4, letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 課題セクション */}
      <section style={{ padding: "72px 24px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 4, marginBottom: 20, textAlign: "center" }}>PROBLEM</div>
        <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, textAlign: "center", marginBottom: 40, lineHeight: 1.4 }}>
          こんなお悩み<br />ありませんか？
        </h2>
        {[
          "SNSだけでは集客に限界を感じている",
          "Googleで調べても店舗情報が出てこない",
          "シフトや給与の管理がExcelで大変",
          "キャストの成績管理が手作業になっている",
          "求人を出す手段が少ない",
        ].map((t, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(167,139,250,0.15)",
            borderRadius: 14, padding: "16px 20px",
            marginBottom: 10, fontSize: 15, color: "rgba(200,190,220,0.8)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ color: "#f472b6", fontSize: 18 }}>⚡</span>
            {t}
          </div>
        ))}
      </section>

      {/* 解決策 */}
      <section style={{
        padding: "72px 24px",
        background: "rgba(124,58,237,0.06)",
        borderTop: "1px solid rgba(124,58,237,0.15)",
        borderBottom: "1px solid rgba(124,58,237,0.15)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 4, marginBottom: 20, textAlign: "center" }}>SOLUTION</div>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, textAlign: "center", marginBottom: 48, lineHeight: 1.4 }}>
            ナイトビジョンが<br />全部解決します
          </h2>

          {[
            {
              icon: "📸", title: "集客・情報掲載",
              desc: "店舗写真・キャスト情報・営業時間・アクセスを掲載。「釧路 スナック」などで検索されたときに表示されます。",
              badge: "フリーから",
            },
            {
              icon: "📅", title: "シフト・出勤管理",
              desc: "キャストのシフト希望を受け付けて確定。出勤カレンダーで今日の出勤状況がひと目でわかります。",
              badge: "ゴールドから",
            },
            {
              icon: "💴", title: "給与・売上管理",
              desc: "伝票入力から日次・月次売上を自動集計。キャスト別の給与明細もワンクリックで出力できます。",
              badge: "ゴールドから",
            },
            {
              icon: "📊", title: "キャスト成績管理",
              desc: "本指名・場内・同伴・ボトルバックを集計。売上/給与比率でキャストのパフォーマンスを可視化。",
              badge: "ゴールドから",
            },
            {
              icon: "💼", title: "求人掲載",
              desc: "サイト内に求人情報を掲載。キャスト・スタッフ募集をサイト訪問者に届けます。",
              badge: "ゴールドから",
            },
            {
              icon: "💬", title: "LINE通知",
              desc: "シフト確定や応募があったとき、LINEでオーナー・キャストに自動通知。見逃しがなくなります。",
              badge: "ゴールドから",
            },
          ].map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(167,139,250,0.18)",
              borderRadius: 20, padding: "24px",
              marginBottom: 14,
              display: "flex", gap: 18, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 36, flexShrink: 0, lineHeight: 1 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "#e8e0f0" }}>{f.title}</span>
                  <span style={{
                    fontSize: 10, color: "#a78bfa",
                    border: "1px solid rgba(167,139,250,0.35)",
                    padding: "2px 8px", borderRadius: 10,
                  }}>{f.badge}</span>
                </div>
                <p style={{ fontSize: 14, color: "rgba(190,180,210,0.72)", lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 料金 */}
      <section style={{ padding: "72px 24px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 4, marginBottom: 20, textAlign: "center" }}>PRICING</div>
        <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, textAlign: "center", marginBottom: 40 }}>シンプルな料金体系</h2>

        {/* フリープラン */}
        <div style={{
          border: "1px solid rgba(167,139,250,0.25)",
          borderRadius: 20, padding: "28px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(167,139,250,0.7)", letterSpacing: 2, marginBottom: 4 }}>FREE PLAN</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>¥0 <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(200,190,220,0.6)" }}>/月</span></div>
            </div>
            <span style={{ fontSize: 11, background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", padding: "4px 12px", borderRadius: 10 }}>無料</span>
          </div>
          {["店舗名・基本情報の掲載", "営業時間・アクセスの掲載", "会員登録・管理画面の利用"].map(t => (
            <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, fontSize: 14, color: "rgba(200,190,220,0.75)" }}>
              <span style={{ color: "#10b981" }}>✓</span>{t}
            </div>
          ))}
        </div>

        {/* ゴールドプラン */}
        <div style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.12))",
          border: "1px solid rgba(167,139,250,0.4)",
          borderRadius: 20, padding: "28px", marginBottom: 32,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 16, right: 16,
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            fontSize: 11, color: "#fff", padding: "4px 12px", borderRadius: 10, fontWeight: 700,
          }}>おすすめ</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#a78bfa", letterSpacing: 2, marginBottom: 4 }}>GOLD PLAN</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>¥3,000 <span style={{ fontSize: 14, fontWeight: 400, color: "rgba(200,190,220,0.6)" }}>/月（税込）</span></div>
          </div>
          {[
            "フリープランの全機能",
            "バナー写真・キャスト写真の掲載",
            "シフト・出勤管理",
            "売上管理・給与計算",
            "キャスト成績管理",
            "求人掲載",
            "LINE通知",
          ].map(t => (
            <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, fontSize: 14, color: "rgba(200,190,220,0.8)" }}>
              <span style={{ color: "#a78bfa" }}>✦</span>{t}
            </div>
          ))}
        </div>

        <Link href="/join" style={{
          display: "block", textAlign: "center",
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          color: "#fff", padding: "16px", borderRadius: 30,
          fontSize: 17, fontWeight: 800, textDecoration: "none",
          boxShadow: "0 8px 32px rgba(124,58,237,0.35)",
        }}>🚀 まず無料で始める</Link>
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(160,150,180,0.5)", marginTop: 12 }}>
          クレジットカード不要 · いつでも解約可能
        </p>
      </section>

      {/* 手順 */}
      <section style={{
        padding: "72px 24px",
        background: "rgba(124,58,237,0.06)",
        borderTop: "1px solid rgba(124,58,237,0.15)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#a78bfa", letterSpacing: 4, marginBottom: 20, textAlign: "center" }}>HOW TO START</div>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, textAlign: "center", marginBottom: 40 }}>
            たった3ステップ
          </h2>
          {[
            { num: "01", title: "お店を検索", desc: "night-vision.jp/join にアクセスして、お店の名前で検索。すでに掲載されているお店も多数あります。" },
            { num: "02", title: "メール・PW登録のみ", desc: "名前・電話番号は不要。メールアドレスとパスワードだけで完了。5分で管理画面が使えます。" },
            { num: "03", title: "情報を充実させる", desc: "写真・営業時間・キャスト情報などを入力。掲載内容が充実するほど集客効果が上がります。" },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 20, marginBottom: 28,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(167,139,250,0.15)",
              borderRadius: 18, padding: "22px",
            }}>
              <div style={{
                width: 52, height: 52, flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 900, color: "#fff",
              }}>{s.num}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8e0f0", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "rgba(190,180,210,0.7)", lineHeight: 1.8 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 最終CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🦉</div>
          <h2 style={{ fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 900, marginBottom: 16, lineHeight: 1.4 }}>
            今夜から始めませんか
          </h2>
          <p style={{ fontSize: 15, color: "rgba(200,190,220,0.7)", lineHeight: 1.9, marginBottom: 36 }}>
            釧路で一番使われる店舗情報サービスを目指しています。<br />
            まずは無料で登録して、サービスを体験してください。
          </p>
          <Link href="/join" style={{
            display: "block",
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
            color: "#fff", padding: "18px", borderRadius: 30,
            fontSize: 17, fontWeight: 800, textDecoration: "none",
            boxShadow: "0 8px 40px rgba(124,58,237,0.4)",
            marginBottom: 16,
          }}>無料で会員登録する →</Link>
          <div style={{ fontSize: 13, color: "rgba(160,150,180,0.5)" }}>
            ご不明な点は <a href="mailto:info@night-vision.jp" style={{ color: "#a78bfa" }}>info@night-vision.jp</a> まで
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer style={{
        borderTop: "1px solid rgba(124,58,237,0.15)",
        padding: "24px", textAlign: "center",
        fontSize: 12, color: "rgba(160,150,180,0.4)",
      }}>
        <Link href="/" style={{ color: "rgba(167,139,250,0.6)", textDecoration: "none", marginRight: 20 }}>← サイトトップ</Link>
        © 2025 釧路ナイトビジョン
      </footer>
    </div>
  );
}
