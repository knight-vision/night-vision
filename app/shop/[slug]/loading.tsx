// 詳細ページ取得中に即表示されるスケルトン。
// タップ→遷移の体感速度を改善する（force-dynamicでデータ取得を待つ間の白画面を防ぐ）。
export default function Loading() {
  const shimmer: React.CSSProperties = {
    background:
      "linear-gradient(90deg, var(--bg-card) 0%, var(--bg-input) 50%, var(--bg-card) 100%)",
    backgroundSize: "200% 100%",
    animation: "nv-shimmer 1.2s ease-in-out infinite",
    borderRadius: 10,
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`@keyframes nv-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ヒーロー画像 */}
      <div style={{ ...shimmer, height: 260, borderRadius: 0 }} />

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 80px" }}>
        {/* タイトル行 */}
        <div style={{ padding: "20px 0 16px" }}>
          <div style={{ ...shimmer, height: 26, width: "55%", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <div style={{ ...shimmer, height: 22, width: 70, borderRadius: 999 }} />
            <div style={{ ...shimmer, height: 22, width: 90, borderRadius: 999 }} />
          </div>
          <div style={{ ...shimmer, height: 14, width: "40%" }} />
        </div>

        {/* 情報カード */}
        <div style={{ ...shimmer, height: 140, borderRadius: 20, marginBottom: 20 }} />
        <div style={{ ...shimmer, height: 200, borderRadius: 20, marginBottom: 20 }} />
        <div style={{ ...shimmer, height: 120, borderRadius: 20 }} />
      </main>
    </div>
  );
}
