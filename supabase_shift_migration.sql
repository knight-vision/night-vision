-- ============================================
-- シフト管理機能 マイグレーションSQL
-- Supabaseのダッシュボード > SQL Editor で実行
-- ============================================

-- 1. キャストアカウントテーブル
CREATE TABLE IF NOT EXISTS cast_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id INTEGER NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. キャスト希望シフトテーブル
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id INTEGER NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cast_id, date) -- 1日1件まで
);

-- 3. 確定シフトテーブル
CREATE TABLE IF NOT EXISTS confirmed_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_id INTEGER NOT NULL REFERENCES casts(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cast_id, date) -- 1日1件まで
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_shift_requests_shop_date ON shift_requests(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_requests_cast ON shift_requests(cast_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_shifts_shop_date ON confirmed_shifts(shop_id, date);
CREATE INDEX IF NOT EXISTS idx_confirmed_shifts_cast ON confirmed_shifts(cast_id);
CREATE INDEX IF NOT EXISTS idx_cast_accounts_cast_id ON cast_accounts(cast_id);

-- RLS（Row Level Security）は anon key でアクセスするので無効のままでOK
-- 必要に応じて追加してください
