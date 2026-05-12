import Link from 'next/link';

export default function Header() {
  return (
    <header
      style={{
        background: 'linear-gradient(180deg, #0d0d1f 0%, #08080f 100%)',
        borderBottom: '1px solid #ffffff0a',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ cursor: 'pointer' }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: '-0.03em',
              }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #ff6b9d, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                釧路ナイトビジョン
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#ffffff33',
                letterSpacing: '0.15em',
                marginTop: 1,
              }}
            >
              KUSHIRO NIGHT VISION
            </div>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: 'スナック', href: '/snack' },
            { label: 'ガールズバー', href: '/girls-bar' },
            { label: 'ラウンジ', href: '/lounge' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: 'none' }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: '#ffffff55',
                  padding: '4px 10px',
                  borderRadius: 20,
                  border: '1px solid #ffffff15',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
