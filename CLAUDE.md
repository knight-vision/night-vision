# CLAUDE.md — NIGHT VISION 開発ガイド

このファイルは Claude Code が作業前に必ず読むプロジェクト規約です。
**コードを書く前にこのファイル全体を読み、ここに書かれた手順・規約に従ってください。**

---

## 0. 最重要ルール（必ず守る）

1. **実装したら必ず検証する。** 型チェック (`npx tsc --noEmit`) とビルド (`npx next build`) が両方通るまで完了とみなさない。エラーが出たら直してから次に進む。
2. **大きなUI変更・新機能は、実装前に設計（何をどう変えるか）を箇条書きで説明し、ユーザーの確認を取る。** 方向性が固まってから実装に入る。
3. **店舗運営の心臓部（伝票保存・売上集計・給与計算）を変更するときは特に慎重に。** 既存の動作を壊さないか、新しいデータで1件ずつ検証する。
4. **推測で「直った」と言わない。** 原因が不明なときは、一時的な診断用APIやログで事実を確認してから対処する。確認できた事実に基づいて判断する。
5. **作業はトピックごとに小さくコミットする。** 1コミット=1つの意味のある変更。コミットメッセージは日本語で、背景・原因・対処を書く。
6. **機能や見た目を変更したら、必ず動作確認をする。** 型チェック・ビルドが通るだけでは「完了」ではない。実際に該当機能・画面を動かし、意図どおりに動作し既存の動作を壊していないことを確認できて初めて完了とする。確認できない場合は「未確認」と明示し、ユーザーにどう確認すればよいかを具体的に伝える。

---

## 1. プロジェクト概要

**NIGHT VISION**（ナイトビジョン） — 北海道釧路発、夜間飲食店（ラウンジ・ガールズバー・スナック・キャバクラ等）向けのB2Bプラットフォーム。

- 本番URL: https://www.night-vision.jp （**wwwあり必須**。wwwなしはリダイレクトされる）
- 運営: bit garden k.k.
- 利用者は3種類:
  - **一般客** … 店舗・キャストの公開ページを見る（集客）
  - **店舗オーナー/管理者** … 店舗情報・キャスト・シフト・売上・給与を管理（`/owner/dashboard`）
  - **キャスト** … 自分の成績・給与・シフト・写真を見る（`/cast-portal`）

### コアコンセプト
**「伝票を1回入力すれば、キャスト成績・店舗売上・給与明細・エクスポートまで自動で派生する」**
バラバラだった店舗売上Excel・キャスト成績Excel・給与明細Excelを1本化するのが狙い。

---

## 2. 技術スタック

| 領域 | 技術 |
|------|------|
| フレームワーク | Next.js 14.1.0（App Router） |
| 言語 | TypeScript |
| DB / 認証 / ストレージ | Supabase（PostgreSQL + Storage） |
| ホスティング | Vercel |
| 決済 | Stripe |
| メール | Resend |
| プッシュ通知 | Expo Push（キャスト向けモバイル） |
| スタイル | インラインstyle + CSS変数（`globals.css`）。Tailwindは導入済みだが主にインラインstyleを使用 |

---

## 3. ディレクトリ構成

```
app/
  page.tsx                  トップページ
  layout.tsx                共通レイアウト
  [prefecture]/             都道府県→市→業種の階層URL（SEO）
  shop/[slug]/              店舗の公開ページ
  cast/[id]/                キャストの公開ページ
  owner/dashboard/          ★店舗オーナー管理画面（最重要・巨大ファイル）
  cast-portal/              キャスト用ポータル
  admin/                    運営者用管理
  api/                      APIルート（Route Handlers）
components/                 Reactコンポーネント
  SalesTab.tsx              ★売上管理（伝票入力・伝票一覧・メニュー登録・店舗売上・キャスト売上）
  ShiftManagementTab.tsx    シフト・給与明細
  CastPhotoManager.tsx      店舗管理者がキャスト写真を設定
  CastPhotosPanel.tsx       キャスト本人が写真を設定
  ...
lib/
  shops.ts                  supabaseクライアント（anon key）+ 店舗系ヘルパー
  dateRange.ts              月の日付範囲を安全に計算（重要・後述）
  plan.ts / line.ts / ...
*.sql                       Supabaseマイグレーション（手動実行）
```

**特に大きいファイル**: `app/owner/dashboard/page.tsx` と `components/SalesTab.tsx` は数千行ある。編集時は該当箇所だけを正確に変更し、JSXの閉じタグ構造を必ず検証すること。

---

## 4. データモデル（主要テーブル）

- **shops** … 店舗。`image`（メイン画像URL）、`photos`（画像URL配列）、`plan`、`slug` など
- **shop_owners** … オーナーアカウント
- **casts** … キャスト。`name, age, comment(プロフィール), instagram, x_account, tiktok_account, on_today, hourly_wage, shop_id`。`id` は数値。**`birthplace`は廃止済み（使わない）**
- **cast_accounts** … キャストのログインアカウント。**`id` はUUID型（数値変換するとNaNになるので注意）**
- **slips** … 伝票（1来店=1伝票）。`date, total, payment, cast_entries(JSON), items(JSON), memo`
- **slip_allocations** … 伝票の品目をキャストに割り当てた明細
- **cast_sales** … キャストの売上集計（成績の元データ）。`cast_id(数値), date, sales_type, amount, count`
- **shop_menus** … メニュー（旧「品名マスタ」）。`name, price, back_type, back_value, is_default, nomination_type`
- **photo_requests** … 写真（キャスト写真・店舗画像 共通）。`cast_id, shop_id, owner_id, type, url, status, sort_order`
- **payroll_rules / cast_payroll_rules** … 給与ルール（時給・バック率）。UIは未実装
- **shifts / 確定シフト系** … 勤務予定・実績

### sales_type の種類（成績の区分）
- 指名種別（接客形態・1人に1つ）: `free`(フリー), `baai`(場内指名), `honshimei`(本指名)
- メニュー由来: `douhan`(同伴), `after`(アフター), `trip`(出張), `bottle`(ボトル), `drink`(ドリンク)
- **同伴・アフター・出張は「指名種別」ではなく「メニュー」。** 誰が同伴したかは指名キャストで分かる（同伴は指名とセットだから）

---

## 5. 認証・セキュリティモデル（重要）

- ログイン状態は **localStorage** に `owner_id` / `shop_id` / `cast_account` 等を保持するシンプルな方式（JWTセッションではない）。
- **クライアント側（anon key）からDBを直接書き込むとRLS（行レベルセキュリティ）で弾かれることがある。**
  - 過去に「店舗ユーザーがキャスト写真をアップロードできない」という不具合が発生。原因は anon key での `photo_requests` への直接insertがRLSで拒否されていたこと。
  - **対策の原則: 書き込み系（insert/update/delete）は service role keyを使うAPIルート経由で行う。** クライアントから直接 `supabase.from(...).insert()` しない。
- service role key は **APIルート内だけ**で使う（`process.env.SUPABASE_SERVICE_ROLE_KEY`）。フロントに絶対露出させない。
- APIルートで「このユーザーがこの店舗の持ち主か」を必要に応じて検証する（`shop_owners` との照合）。

---

## 6. 画像アップロードの方式（確立済みパターン）

スマホ写真は1枚で数MB〜20MB。**Next.jsのAPI body上限（約4MB）を経由するとアップロードに失敗する。**
そのため **「署名付きアップロードURL方式」** を使う（画質を落とさず20MBまで対応）:

1. クライアント → API に `action: "sign"` を送る → API（service role）が `createSignedUploadUrl` で署名URLを発行
2. クライアント → `supabase.storage.from("shop-images").uploadToSignedUrl(path, token, file)` で **Storageへ直接アップロード**（Next.jsを経由しない＝4MB制限なし・無劣化）
3. クライアント → API に `action: "register"` を送る → API が `photo_requests` に登録し、必要なら `shops.image/photos` も更新

- バケット名: **`shop-images`**
- 画像の圧縮はしない（画質維持）。上限20MB、超過時のみ警告。
- 写真の審査は現在なし（アップロード即 `status: "approved"`）。審査を戻す場合は `status: "pending"` にするだけ。仕組み（`admin/photo-requests`）は温存してある。
- 参考実装: `app/api/cast-photos/route.ts`, `app/api/upload-image/route.ts`, `components/CastPhotoManager.tsx`

---

## 7. ハマりどころ（既知の落とし穴・必ず守る）

### 7-1. 月末日の日付フィルタ（最重要）
**`` `${month}-31` `` のような末尾31固定は絶対に使わない。** 6月31日など存在しない日付で、2/4/6/9/11月（31日のない月）にDBの日付比較がエラー/0件になる重大バグの原因になった。
- 必ず `lib/dateRange.ts` の `monthRange(month)`（翌月1日未満）または `monthLastDay(month)`（正しい末日）を使う。
- 月範囲フィルタは「その月の1日 〜 翌月1日の手前」で表現する。

### 7-2. UUID と数値の混同
`cast_accounts.id` は **UUID型**。`Number()` で変換するとNaNになり、プッシュトークン保存などが無音で失敗する。UUIDは文字列のまま扱う。一方 `casts.id` は数値。比較時に型を合わせる（`String(a) === String(b)` など）。

### 7-3. JSX大規模編集後の閉じタグずれ
`owner/dashboard/page.tsx` や `SalesTab.tsx` は巨大。条件分岐 `{cond && (<>...</>)}` のネストが深く、`</div>` や `</>` の数が合わないとビルドが `TS17002` / `TS17015` で落ちる。
- **編集後は必ず `npx tsc --noEmit` → `npx next build` で構造を検証する。**

### 7-4. 未使用import
未使用の import / 変数があると Next.js ビルドで警告・エラーになることがある。機能を削除したら、それに伴って使われなくなった import も消す。

### 7-5. next/image の最適化
`next.config.js` で `images.unoptimized: true` にしている（初回アクセスのサーバー変換待ちをなくすため）。これは意図的な設定。勝手に戻さない。

---

## 8. 開発ワークフロー（毎回これに従う）

### 8-1. 作業の進め方
1. **指示を理解し、設計を立てる。** 大きい変更なら「何をどのファイルでどう変えるか」を箇条書きでユーザーに説明し、確認を取ってから実装する。
2. **関連する既存コードを読む。** 流用できるパターン（特にこのファイルの6章・7章）を探す。憶測で新規実装せず、動いている類似機能に揃える。
3. **実装する。** 小さい単位で。
4. **検証する**（必須・後述の8-2）。
5. **コミット&プッシュする**（8-3）。
6. **ユーザーに、何を変えたか・どう確認すればよいかを簡潔に伝える。**

### 8-2. 検証手順（コミット前に必ず実行）
```bash
# 1. 型チェック
npx tsc --noEmit

# 2. ビルド検証（.env.localにダミー値が必要）
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_anon_key
SUPABASE_SERVICE_ROLE_KEY=dummy_service_key
RESEND_API_KEY=dummy
ADMIN_EMAIL=test@test.com
STRIPE_SECRET_KEY=sk_test_dummy
EOF
npx next build
rm -f .env.local
```
- ビルド出力に `✓ Compiled successfully` と `✓ Generating static pages` が出ればOK。
- `CssSyntaxError: <css input>` という警告はサンドボックス特有のもので**無害**（無視してよい）。
- `Failed to compile` / `Type error` / `TS17002` 等が出たら**必ず直してから**コミットする。
- 生成ページ数（現在 約84ページ）が極端に減っていないかも確認。

### 8-3. コミット規約
```bash
git config user.email "dev@night-vision.jp"
git config user.name "Night Vision Dev"
git add -A
git commit -m "日本語で: 何を・なぜ・どう変えたか"
git pull --rebase   # リモートに別変更が入っている場合に備える
git push
```
- コミットメッセージは日本語。バグ修正なら「原因」と「対処」を本文に書く。
- 1コミット=1つの意味的変更。無関係な変更を混ぜない。

### 8-4. 診断のやり方（原因不明のバグ）
推測で直さない。一時的な診断用APIルート（例: `app/api/debug-xxx/route.ts`）を作り、service roleで実際のデータ・insert可否・スキーマを確認する。**原因を事実で特定したら、診断APIは必ず削除する。**

---

## 9. コーディング規約

- **言語・コメント・UI文言は日本語。**
- 文字列置換で複雑な編集をするときは、壊れやすいので慎重に。広範囲の機械的置換より、対象を絞った確実な置換を優先。
- 既存のスタイル（CSS変数 `var(--accent)` 等、インラインstyleの書き方）に合わせる。globals.css のCSS変数を使う。
- API は Route Handler（`export async function GET/POST/...`）。書き込み系は service role。
- 不要・冗長と判断した機能（重複タブ等）は、確認の上すぐ削除・統合してよい。
- ユーザー（プロダクトオーナー）への説明は簡潔に。長い前置きより、変えた点と確認方法を端的に。

---

## 10. テスト環境（動作確認に使う）

- テスト店舗: **ラウンジ光**（`shop_id = 97`）
- テストキャスト: **ひかり**（`cast_id = 21`）、**なな**（`cast_id = 22`）
- これらは実データなので、破壊的な操作（削除・大量変更）は避け、確認は読み取り中心で。

---

## 11. ロードマップ（売上管理システム）

- ✅ ① 伝票入力 → キャスト売上の連携
- ✅ ④ キャスト成績の可視化（ランキング・勤務情報・本数・売上/給与比率）※一部
- ⬜ ② 給与ルール設定UI（`payroll_rules`/`cast_payroll_rules` のテーブルは作成済み、UIが未実装）
- ⬜ ③ 給与明細の自動生成・PDF出力
- ⬜ ⑤ 売上・経費・給与の CSV/PDF エクスポート（税理士・確定申告向け）
- ⬜ 売上ランキング内訳に全 sales_type（フリー等）を表示する集計
- ⬜ 同伴・アフター・出張を「メニュー」として成績計上する保存ロジック（心臓部・慎重に）
- ⬜ 伝票の編集モードでも cast_sales を再計算する（現状、編集時は未更新の既知課題）

---

## 12. 環境変数（`.env.local` / Vercel）

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL（公開可） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（公開可・読み取り中心） |
| `SUPABASE_SERVICE_ROLE_KEY` | **秘密。APIルート内のみ。書き込み・RLS回避** |
| `RESEND_API_KEY` | メール送信 |
| `ADMIN_EMAIL` | 運営通知先 |
| `STRIPE_SECRET_KEY` | 決済 |

`.gitignore` に `.env.local` が入っていること。秘密鍵をコミットしない。

---

## 13. SQLマイグレーション

スキーマ変更が必要なときは、リポジトリルートに `supabase_xxx_migration.sql` を作る。
**実行はユーザーが Supabase の SQL Editor で手動で行う**（Claude Codeは直接DBスキーマを変更できない）。
SQLファイルを作ったら、ユーザーに「このSQLをSupabaseで実行してください」と明示的に伝える。
