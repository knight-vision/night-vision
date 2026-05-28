-- 顧客管理テーブル
create table if not exists customers (
  id bigserial primary key,
  shop_id bigint not null references shops(id) on delete cascade,
  cast_id bigint references casts(id) on delete set null,
  name text not null default '名前なし',
  memo text,
  last_visited timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists customers_shop_id_idx on customers(shop_id);
create index if not exists customers_cast_id_idx on customers(cast_id);
