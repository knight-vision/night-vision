import Header from '@/components/Header';
import ShopCard from '@/components/ShopCard';
import { SHOPS } from '@/lib/shops';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    '釧路ナイトビジョン｜釧路の飲み屋・スナック・ガールズバー・ラウンジ情報',
  description:
    '釧路の飲み屋・スナック・ガールズバー・ラウンジ・キャバクラ情報ならここ。地域密着のナイトガイドで今夜のお店を見つけよう。',
};

export default function HomePage() {
  const onTotal = SHOPS.reduce(
    (a, s) => a + s.casts.filter((c) => c.on_today).length,
    0
  );

  return (
    <>
      <Header />
      <main
        style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}
      >
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.3,
              background: 'linear-gradient(135deg, #ff6b9d, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 10,
            }}
          >
            釧路の夜を、もっと近くに。
          </h1>
          <p style={{ color: '#ffffff66', fontSize: 14, lineHeight: 1.8 }}>
            釧路のスナック・ガールズバー・ラウンジ情報を一か所に。
            <br />
            地元だから知っている、本当のナイトライフガイド。
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 16,
              padding: '6px 16px',
              borderRadius: 20,
              background: '#00ff8812',
              border: '1px solid #00ff8830',
              fontSize: 13,
              color: '#00ff88',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#00ff88',
                boxShadow: '0 0 6px #00ff88',
              }}
            />
            現在 {onTotal}名 出勤中
          </div>
        </section>

        {/* カテゴリナビ */}
        <section
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: '🍶 スナック', href: '/snack', color: '#ff6b9d' },
            { label: '🍹 ガールズバー', href: '/girls-bar', color: '#00d4ff' },
            { label: '🥂 ラウンジ', href: '/lounge', color: '#ffd700' },
          ].map((cat) => (
            <a
              key={cat.href}
              href={cat.href}
              style={{
                flex: 1,
                minWidth: 100,
                padding: '12px 8px',
                borderRadius: 12,
                textAlign: 'center',
                background: '#ffffff06',
                border: '1px solid #ffffff12',
                color: cat.color,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </a>
          ))}
        </section>

        {/* 構造化データ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '釧路ナイトビジョン',
              url: 'https://night-vision.jp',
              description: '釧路のスナック・ガールズバー・ラウンジ情報サイト',
            }),
          }}
        />

        {/* 店舗一覧 */}
        <section>
          <h2
            style={{
              color: '#ffffff55',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              marginBottom: 14,
            }}
          >
            掲載店舗 {SHOPS.length}件
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SHOPS.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        </section>

        {/* SEOテキスト */}
        <section
          style={{
            marginTop: 48,
            padding: 24,
            background: '#ffffff04',
            borderRadius: 12,
            border: '1px solid #ffffff08',
          }}
        >
          <h2
            style={{
              color: '#ffffff44',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            釧路のナイトライフ情報
          </h2>
          <p style={{ color: '#ffffff33', fontSize: 12, lineHeight: 2 }}>
            釧路ナイトビジョンは、北海道釧路市のスナック・ガールズバー・ラウンジ・飲み屋の情報を
            地域密着でお届けするナイトガイドです。末広町・北大通・新橋大通エリアを中心に、
            初めての方でも安心して入れるお店を厳選して掲載しています。
            釧路でお酒を楽しみたい方、スナックやガールズバーを探している方はぜひご活用ください。
          </p>
        </section>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px 16px 40px',
          color: '#ffffff22',
          fontSize: 11,
          borderTop: '1px solid #ffffff08',
        }}
      >
        © 2025 釧路ナイトビジョン · 掲載・お問い合わせはDMにてどうぞ
      </footer>
    </>
  );
}
