import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | NIGHT VISION',
  description: 'NIGHT VISIONのプライバシーポリシーです。',
};

export default function PrivacyPage() {
  const lastUpdated = '2026年5月25日';

  return (
    <div style={{
      backgroundColor: '#0a0a0f',
      minHeight: '100vh',
      color: '#f0eef8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: '0.5px solid rgba(180,160,255,0.15)', paddingBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#c9a84c', letterSpacing: '0.15em', marginBottom: 12 }}>
            NIGHT VISION
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#f0eef8', margin: 0, marginBottom: 12 }}>
            プライバシーポリシー
          </h1>
          <p style={{ fontSize: 13, color: '#5a5868', margin: 0 }}>
            最終更新日：{lastUpdated}
          </p>
        </div>

        <div style={{ lineHeight: 1.9, fontSize: 15, color: '#8a8899' }}>

          <Section title="1. はじめに">
            <p>Stellar Port（以下「当社」）は、NIGHT VISIONアプリおよびウェブサービス（以下「本サービス」）において、
            ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
            本サービスをご利用いただく前に、本ポリシーをお読みください。</p>
          </Section>

          <Section title="2. 収集する情報">
            <p>当社は以下の情報を収集します：</p>
            <ul>
              <li><strong style={{ color: '#f0eef8' }}>アカウント情報</strong>：メールアドレス、パスワード（暗号化済み）</li>
              <li><strong style={{ color: '#f0eef8' }}>業務情報</strong>：勤務シフト、売上データ、給与情報</li>
              <li><strong style={{ color: '#f0eef8' }}>デバイス情報</strong>：プッシュ通知トークン、OSの種類</li>
              <li><strong style={{ color: '#f0eef8' }}>利用状況</strong>：ログイン日時、アプリの使用状況</li>
            </ul>
          </Section>

          <Section title="3. 情報の利用目的">
            <p>収集した情報は以下の目的で利用します：</p>
            <ul>
              <li>本サービスの提供・運営・改善</li>
              <li>シフト管理・売上管理・給与計算機能の提供</li>
              <li>プッシュ通知の送信（シフト承認・各種お知らせ）</li>
              <li>カスタマーサポートへの対応</li>
              <li>不正利用の防止およびセキュリティの確保</li>
            </ul>
          </Section>

          <Section title="4. 情報の第三者提供">
            <p>当社は、以下の場合を除き、収集した個人情報を第三者に提供しません：</p>
            <ul>
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
          </Section>

          <Section title="5. 利用する外部サービス">
            <p>本サービスは以下の外部サービスを利用しています：</p>
            <ul>
              <li><strong style={{ color: '#f0eef8' }}>Supabase</strong>：データベース・認証（<a href="https://supabase.com/privacy" style={{ color: '#c9a84c' }}>プライバシーポリシー</a>）</li>
              <li><strong style={{ color: '#f0eef8' }}>Expo / EAS</strong>：アプリ配信・プッシュ通知（<a href="https://expo.dev/privacy" style={{ color: '#c9a84c' }}>プライバシーポリシー</a>）</li>
              <li><strong style={{ color: '#f0eef8' }}>Stripe</strong>：決済処理（<a href="https://stripe.com/jp/privacy" style={{ color: '#c9a84c' }}>プライバシーポリシー</a>）</li>
              <li><strong style={{ color: '#f0eef8' }}>LINE</strong>：通知・ログイン連携（<a href="https://line.me/ja/terms/policy/" style={{ color: '#c9a84c' }}>プライバシーポリシー</a>）</li>
            </ul>
          </Section>

          <Section title="6. データの保管・セキュリティ">
            <p>収集した情報はSSL暗号化通信により保護され、Supabase（PostgreSQL）に安全に保管されます。
            パスワードはハッシュ化して保存し、平文では保管しません。</p>
          </Section>

          <Section title="7. データの保持期間">
            <p>アカウントが有効な期間中、および退会後1年間データを保持します。
            ユーザーからの削除依頼があった場合は、法令上の義務がある場合を除き、速やかに削除します。</p>
          </Section>

          <Section title="8. ユーザーの権利">
            <p>ユーザーは以下の権利を有します：</p>
            <ul>
              <li>自身の個人情報への<strong style={{ color: '#f0eef8' }}>アクセス・確認</strong></li>
              <li>個人情報の<strong style={{ color: '#f0eef8' }}>訂正・更新</strong></li>
              <li>個人情報の<strong style={{ color: '#f0eef8' }}>削除（忘れられる権利）</strong></li>
              <li>プッシュ通知の<strong style={{ color: '#f0eef8' }}>受信拒否</strong>（端末設定から変更可能）</li>
            </ul>
            <p>権利の行使については、下記お問い合わせ先までご連絡ください。</p>
          </Section>

          <Section title="9. Cookieの使用">
            <p>本ウェブサービスでは、ログイン状態の維持およびサービス改善のためにCookieを使用しています。
            ブラウザの設定によりCookieを無効にすることができますが、一部機能が利用できなくなる場合があります。</p>
          </Section>

          <Section title="10. 未成年者のプライバシー">
            <p>本サービスは18歳以上の方を対象としています。18歳未満の方のアカウント登録はお断りしています。</p>
          </Section>

          <Section title="11. プライバシーポリシーの変更">
            <p>本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は、
            アプリ内またはメールにてお知らせします。変更後も本サービスをご利用いただいた場合は、
            変更後のポリシーに同意いただいたものとみなします。</p>
          </Section>

          <Section title="12. お問い合わせ">
            <p>プライバシーに関するお問い合わせは以下までご連絡ください：</p>
            <div style={{
              backgroundColor: '#13131a',
              border: '0.5px solid rgba(180,160,255,0.12)',
              borderRadius: 12,
              padding: '16px 20px',
              marginTop: 12,
            }}>
              <p style={{ margin: 0, color: '#f0eef8' }}>Stellar Port</p>
              <p style={{ margin: '6px 0 0' }}>
                メール：<a href="mailto:kushiro.night.vision@gmail.com" style={{ color: '#c9a84c' }}>
                  kushiro.night.vision@gmail.com
                </a>
              </p>
              <p style={{ margin: '4px 0 0' }}>
                ウェブ：<a href="https://www.night-vision.jp" style={{ color: '#c9a84c' }}>
                  https://www.night-vision.jp
                </a>
              </p>
            </div>
          </Section>
        </div>

        <div style={{
          marginTop: 64,
          paddingTop: 24,
          borderTop: '0.5px solid rgba(180,160,255,0.12)',
          textAlign: 'center',
          fontSize: 12,
          color: '#5a5868',
        }}>
          © 2026 Stellar Port. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: 17,
        fontWeight: 600,
        color: '#f0eef8',
        marginBottom: 14,
        marginTop: 0,
        paddingLeft: 12,
        borderLeft: '2px solid #c9a84c',
      }}>
        {title}
      </h2>
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  );
}
