import Header from '@/components/Header';
import { SHOPS, getShopBySlug } from '@/lib/shops';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return SHOPS.map((shop) => ({ slug: shop.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const shop = getShopBySlug(params.slug);
  if (!shop) return {};
  return {
    title: shop.name + '｜釧路 ' + shop.type,
    description:
      shop.name +
      'は釧路' +
      shop.area +
      'にある' +
      shop.type +
      'です。' +
      shop.description,
  };
}

const TYPE_COLORS: Record<string, { border: string; text: string }> = {
  スナック: { border: '#ff6b9d', text: '#ff6b9d' },
  ガールズバー: { border: '#00d4ff', text: '#00d4ff' },
  ラウンジ: { border: '#ffd700', text: '#ffd700' },
};

export default function ShopPage({ params }: { params: { slug: string } }) {
  const shop = getShopBySlug(params.slug);
  if (!shop) notFound();
  if (!shop) return null;

  const tc = TYPE_COLORS[shop.type] ?? { border: '#fff', text: '#fff' };
  const hasBanner = shop.plan === 'premium' || shop.referred;

  return (
    <div>
      <Header />
      <main
        style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#ffffff55',
            fontSize: 13,
            marginBottom: 20,
            border: '1px solid #ffffff1a',
            padding: '5px 14px',
            borderRadius: 20,
          }}
        >
          一覧に戻る
        </Link>

        <div
          style={{
            background: 'linear-gradient(160deg, #0f0f1a, #1a1028)',
            border: '1px solid #ffffff0f',
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            marginTop: 20,
          }}
        >
          <span
            style={{
              padding: '2px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid ' + tc.border,
              color: tc.text,
            }}
          >
            {shop.type}
          </span>
          <h1
            style={{
              color: '#fff',
              fontSize: 26,
              fontWeight: 900,
              marginTop: 12,
              marginBottom: 10,
            }}
          >
            {shop.name}
          </h1>
          <p
            style={{
              color: '#ffffff88',
              fontSize: 14,
              lineHeight: 1.8,
              marginBottom: 20,
            }}
          >
            {shop.description}
          </p>
          <p style={{ color: '#ffffff66', fontSize: 13 }}>
            エリア: {shop.area}
          </p>
          <p style={{ color: '#ffffff66', fontSize: 13 }}>
            予算: {shop.budget}
          </p>
          <p style={{ color: '#ffffff66', fontSize: 13 }}>
            営業時間: {shop.openHour}
          </p>
          <p style={{ color: '#ffffff66', fontSize: 13 }}>電話: {shop.tel}</p>
        </div>

        <div>
          <h2
            style={{
              color: '#ffffff55',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            キャスト ({shop.casts.length}名)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shop.casts.map((cast) => (
              <div
                key={cast.id}
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  border: '1px solid #ffffff0f',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 700 }}>
                  {cast.name}
                </span>
                <span
                  style={{ color: '#ffffff44', fontSize: 12, marginLeft: 8 }}
                >
                  {cast.age}歳
                </span>
                <p style={{ color: '#ffffff66', fontSize: 12, marginTop: 4 }}>
                  {cast.comment}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: cast.on_today ? '#00ff88' : '#555',
                    marginTop: 4,
                  }}
                >
                  {cast.on_today ? '本日出勤' : '本日休み'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
