// 市区一覧ページの取得中スケルトン。タップ後の体感速度を改善。
function ListSkeleton() {
  const shimmer: React.CSSProperties = {
    background:
      "linear-gradient(90deg, var(--bg-card) 0%, var(--bg-input) 50%, var(--bg-card) 100%)",
    backgroundSize: "200% 100%",
    animation: "nv-shimmer 1.2s ease-in-out infinite",
    borderRadius: 16,
  };
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`@keyframes nv-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px" }}>
        <div style={{ ...shimmer, height: 24, width: "45%", borderRadius: 8, marginBottom: 8 }} />
        <div style={{ ...shimmer, height: 14, width: "70%", borderRadius: 8, marginBottom: 24 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ ...shimmer, height: 180, marginBottom: 16 }} />
        ))}
      </main>
    </div>
  );
}

export default function Loading() {
  return <ListSkeleton />;
}
