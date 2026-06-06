-- ============================================================
-- 売上管理システム再設計マイグレーション
-- ============================================================
-- 設計の核：伝票を1回入力すれば、店舗台帳・キャスト成績・給与明細・
--           エクスポートまで自動で繋がる。
--
-- このSQLで以下を実現する：
--   1. 品名マスタ(shop_menus)にカテゴリ・バック率を追加
--      → 伝票入力時に品目カテゴリが自動判定され、バック率が自動適用
--   2. slip_allocations（新設）
--      → 1伝票の各品目を、どのキャストにどの割合で配分したか
--      → 複数キャストの割合配分（常に合計100%）に対応
--   3. payroll_rules（新設）
--      → 店舗ごとの給与ルール（バック率・サービス料率・割り当て方式）
--   4. cast_payroll_rules（新設）
--      → キャスト個別の上書きルール（時給・バック率）
--
-- 安全性：すべて IF NOT EXISTS / ADD COLUMN IF NOT EXISTS を使い、
--         既存データを壊さず、再実行しても安全(冪等)にしてある。
-- ============================================================


-- ------------------------------------------------------------
-- 1. 品名マスタ(shop_menus)の拡張
-- ------------------------------------------------------------
-- ※ category列は当初カテゴリ分類用に追加したが、設計を見直し廃止。
--    バックは品名ごとに back_type/back_value で個別設定する方式にしたため、
--    category列は使わない（残っていても無害。NOT NULL DEFAULT 'none'）。
-- back_type: バックの計算方式。 fixed=固定額 / rate=料金に対する% / none=なし
-- back_value: back_typeがfixedなら金額(円)、rateなら率(0〜1, 例:0.10=10%)
-- ------------------------------------------------------------
ALTER TABLE shop_menus ADD COLUMN IF NOT EXISTS category   TEXT    NOT NULL DEFAULT 'none';
ALTER TABLE shop_menus ADD COLUMN IF NOT EXISTS back_type  TEXT    NOT NULL DEFAULT 'none';
ALTER TABLE shop_menus ADD COLUMN IF NOT EXISTS back_value NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN shop_menus.back_type  IS 'バック方式: fixed(固定額)/rate(料金に対する割合)/none';
COMMENT ON COLUMN shop_menus.back_value IS 'fixedなら円、rateなら0〜1の率';


-- ------------------------------------------------------------
-- 2. payroll_rules（店舗ごとの給与・割り当てルール）
-- ------------------------------------------------------------
-- 1店舗1行。伝票入力・給与計算のデフォルト挙動を司る。
-- allocation_method: 伝票の売上をキャストに割り当てる既定方式
--   honshimei = 本指名者が全額 / equal = 担当で均等割 / item = 品目ごとに紐付け
-- service_charge_rate: サービス料率(0〜100の%)。お店が自由に設定。
-- service_charge_to_back: サービス料をキャストのバック対象に含めるか(既定false=店舗取り分)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                INTEGER NOT NULL UNIQUE,
  -- 指名系バック（固定額・円）
  honshimei_back         INTEGER NOT NULL DEFAULT 0,
  baai_back              INTEGER NOT NULL DEFAULT 0,
  douhan_back            INTEGER NOT NULL DEFAULT 0,
  -- ドリンク・ボトルバック（料金に対する率・0〜1）
  bottle_rate            NUMERIC NOT NULL DEFAULT 0,
  drink_rate             NUMERIC NOT NULL DEFAULT 0,
  -- 割り当て方式
  allocation_method      TEXT    NOT NULL DEFAULT 'item',
  -- サービス料
  service_charge_rate    NUMERIC NOT NULL DEFAULT 0,
  service_charge_to_back BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_charge_rate_range CHECK (service_charge_rate >= 0 AND service_charge_rate <= 100)
);

COMMENT ON TABLE payroll_rules IS '店舗ごとの給与計算・割り当て・サービス料ルール（1店舗1行）';


-- ------------------------------------------------------------
-- 3. cast_payroll_rules（キャスト個別の上書きルール）
-- ------------------------------------------------------------
-- 店舗ルール(payroll_rules)を、特定キャストだけ上書きしたいとき使う。
-- NULLの項目は「店舗ルールに従う」。値が入っていればそのキャストだけ上書き。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cast_payroll_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id        INTEGER NOT NULL UNIQUE,
  shop_id        INTEGER NOT NULL,
  hourly_wage    INTEGER,    -- 時給(円)。NULLなら casts.hourly_wage を使う
  honshimei_back INTEGER,    -- 本指名バック(円)。NULLなら店舗ルール
  baai_back      INTEGER,
  douhan_back    INTEGER,
  bottle_rate    NUMERIC,    -- 0〜1。NULLなら店舗ルール
  drink_rate     NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE cast_payroll_rules IS 'キャスト個別の給与上書きルール。NULL項目は店舗ルールに従う';


-- ------------------------------------------------------------
-- 4. slip_allocations（伝票→キャストの配分明細）
-- ------------------------------------------------------------
-- 「どの伝票の・どの品目を・どのキャストに・何%・いくら配分したか」を1行ずつ記録。
-- これがキャスト成績・給与の唯一の元データになる。
--   slip_id        : どの伝票か
--   menu_id        : どの品目か（任意。手入力品目はNULL可）
--   cast_id        : どのキャストに付けたか
--   category       : 集計用カテゴリ(honshimei/baai/douhan/bottle/drink/free 等)
--   share_ratio    : 配分割合(0〜1)。複数キャストで分けたときの取り分
--   allocated_sales: そのキャストに付く「担当売上」(円)
--   allocated_back : そのキャストに付く「バック」(円)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS slip_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         INTEGER NOT NULL,
  slip_id         UUID    NOT NULL REFERENCES slips(id) ON DELETE CASCADE,
  menu_id         UUID,
  cast_id         INTEGER NOT NULL,
  date            TEXT    NOT NULL,
  category        TEXT    NOT NULL DEFAULT 'free',
  item_name       TEXT,
  share_ratio     NUMERIC NOT NULL DEFAULT 1,
  allocated_sales INTEGER NOT NULL DEFAULT 0,
  allocated_back  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT share_ratio_range CHECK (share_ratio >= 0 AND share_ratio <= 1)
);

-- 集計でよく使う検索条件にインデックスを張る
CREATE INDEX IF NOT EXISTS idx_slip_alloc_shop_date ON slip_allocations (shop_id, date);
CREATE INDEX IF NOT EXISTS idx_slip_alloc_cast_date ON slip_allocations (cast_id, date);
CREATE INDEX IF NOT EXISTS idx_slip_alloc_slip      ON slip_allocations (slip_id);

COMMENT ON TABLE slip_allocations IS '伝票の各品目をキャストへ配分した明細。成績・給与の元データ';


-- ------------------------------------------------------------
-- 5. slips（伝票）にサービス料カラムを追加
-- ------------------------------------------------------------
-- subtotal(小計)は既存。それにサービス料を足したものが total(合計)。
-- service_charge_rate: その伝票に適用した率(%) / service_charge: 金額(円)
-- ------------------------------------------------------------
ALTER TABLE slips ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE slips ADD COLUMN IF NOT EXISTS service_charge      INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN slips.service_charge_rate IS 'この伝票に適用したサービス料率(%)';
COMMENT ON COLUMN slips.service_charge      IS 'サービス料の金額(円)';


-- ============================================================
-- 完了。次のステップ：
--   - 各店舗の payroll_rules を1行ずつ作成（初期値はUIから設定）
--   - 既存の shop_menus にカテゴリ・バック率を設定（品名マスタUIから）
-- ============================================================
