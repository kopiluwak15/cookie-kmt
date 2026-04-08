-- =====================================================================
-- cookie-kmt: 初期スキーマ
-- 北極星: 「悩み→施術→再来店」の再現性を可視化
-- 設計原則:
--   - すべてのテーブルに store_id を持たせ、将来の多店舗化に備える
--   - 認証は Supabase Auth を使い、staff.auth_user_id で紐付け
--   - LIFFカルテからの初回登録は customers + karte_intakes 2テーブルに分離
--   - 判断ログ (judgment_logs) は北極星KPIの核
-- =====================================================================

-- =============================================
-- 1. 店舗マスタ
-- =============================================
create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,        -- 'kmt'
  name         text not null,               -- 'COOKIE 熊本'
  name_kana    text,
  postal_code  text,
  address      text,
  phone        text,
  email        text,
  business_hours text,
  holidays     text,
  parking_info text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =============================================
-- 2. スタッフ
-- =============================================
create type public.staff_role as enum ('admin', 'staff');

create type public.staff_stage as enum (
  'A1','A2','S1','S2','SM','AM','FW','CA','SP'
);

create table public.staff (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete restrict,
  -- Supabase Auth と紐付け（NULL なら未招待）
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  email         text unique not null,
  name          text not null,
  name_kana     text,
  role          public.staff_role not null default 'staff',
  stage         public.staff_stage,
  joined_at     date,
  enabled       boolean not null default true,
  line_user_id  text,        -- LINE連携用
  avatar_url    text,
  password_initialized boolean not null default false, -- 初回パスワード変更済みか
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index staff_store_id_idx on public.staff(store_id);
create index staff_auth_user_id_idx on public.staff(auth_user_id);

-- =============================================
-- 3. 顧客
-- =============================================
create type public.customer_status as enum ('new','active','at_risk','dormant');
create type public.customer_gender as enum ('female','male','other');

create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete restrict,
  customer_code   text not null,                       -- 'C-000123' 表示用
  name            text not null,
  name_kana       text,
  birthday        date,
  gender          public.customer_gender,
  phone           text,
  email           text,
  address         text,
  occupation      text,
  line_user_id    text unique,
  line_friend_at  timestamptz,
  -- 動的フィールド（来店ごとに更新）
  first_visit_at  date,
  last_visit_at   date,
  visit_count     int not null default 0,
  total_spend     int not null default 0,
  status          public.customer_status not null default 'new',
  is_concept      boolean not null default false,        -- コンセプト顧客フラグ
  main_concern    text,                                  -- 主な悩みカテゴリ
  main_staff_id   uuid references public.staff(id) on delete set null,
  next_recommend_date date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (store_id, customer_code)
);

create index customers_store_id_idx on public.customers(store_id);
create index customers_status_idx on public.customers(status);
create index customers_main_staff_id_idx on public.customers(main_staff_id);

-- =============================================
-- 4. 初回カルテ（QRから記入される質問票）
-- 動的回答は jsonb で保持して将来の項目追加に強くする
-- =============================================
create table public.karte_intakes (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete restrict,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  visit_route     text,           -- ホットペッパー / 紹介 / Instagram ...
  todays_wish     jsonb,          -- string[]
  history         jsonb,          -- string[]
  worries         jsonb,          -- string[]
  worries_other   text,
  reasons         jsonb,          -- string[]
  reasons_other   text,
  stay_style      text,
  stay_style_other text,
  dislikes        jsonb,          -- string[]
  dislikes_other  text,
  spots           jsonb,          -- string[] (頭部スポットID)
  selected_menus  jsonb,          -- int[] (menu.id)
  is_concept_session boolean not null default false,
  raw             jsonb,          -- 未来の項目に備えてフォーム全体を保存
  created_at      timestamptz not null default now()
);

create index karte_intakes_customer_id_idx on public.karte_intakes(customer_id);
create index karte_intakes_store_id_idx on public.karte_intakes(store_id);

-- =============================================
-- 5. メニューマスタ
-- =============================================
create type public.menu_category as enum (
  'cut','color','perm','straight','treatment','spa','set','option'
);

create table public.menus (
  id          int primary key,                -- ハードコード互換のため数値ID
  store_id    uuid not null references public.stores(id) on delete restrict,
  name        text not null,
  category    public.menu_category not null,
  price       int not null,
  is_concept  boolean not null default false,
  enabled     boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index menus_store_id_idx on public.menus(store_id);

-- =============================================
-- 6. 来店履歴
-- =============================================
create table public.visits (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete restrict,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  staff_id      uuid not null references public.staff(id) on delete restrict,
  visited_at    timestamptz not null default now(),
  total_price   int not null default 0,
  is_concept    boolean not null default false,
  summary       text,                  -- お客様向け申し送り
  internal_note text,                  -- スタッフ間メモ
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index visits_customer_id_idx on public.visits(customer_id);
create index visits_staff_id_idx on public.visits(staff_id);
create index visits_visited_at_idx on public.visits(visited_at desc);

-- 来店ごとのメニュー（多対多）
create table public.visit_menus (
  visit_id     uuid not null references public.visits(id) on delete cascade,
  menu_id      int not null references public.menus(id) on delete restrict,
  unit_price   int not null,
  primary key (visit_id, menu_id)
);

-- =============================================
-- 7. 判断ログ（北極星KPIの核）
-- =============================================
create table public.judgment_logs (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.visits(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  menu_name   text not null,
  note        text not null,
  created_at  timestamptz not null default now()
);

create index judgment_logs_customer_id_idx on public.judgment_logs(customer_id);
create index judgment_logs_staff_id_idx on public.judgment_logs(staff_id);

-- =============================================
-- 8. スタッフコメント（マイページ用）
-- =============================================
create table public.staff_comments (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references public.visits(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  body        text not null,
  posted_at   timestamptz not null default now()
);

create index staff_comments_visit_id_idx on public.staff_comments(visit_id);

-- =============================================
-- 9. チケット
-- =============================================
create type public.ticket_status as enum ('unused','held','used','expired');

create table public.ticket_templates (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete restrict,
  type            text not null,
  title           text not null,
  description     text,
  discount_amount int,
  discount_rate   int,
  valid_months    int not null default 2,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (store_id, type)
);

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete restrict,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  template_id     uuid references public.ticket_templates(id) on delete set null,
  title           text not null,
  description     text,
  discount_amount int,
  discount_rate   int,
  issued_at       timestamptz not null default now(),
  issued_by       uuid references public.staff(id) on delete set null,
  expires_at      timestamptz not null,
  status          public.ticket_status not null default 'unused',
  used_at         timestamptz,
  held_at         timestamptz
);

create index tickets_customer_id_idx on public.tickets(customer_id);
create index tickets_status_idx on public.tickets(status);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger trg_staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_menus_updated_at before update on public.menus
  for each row execute function public.set_updated_at();
create trigger trg_visits_updated_at before update on public.visits
  for each row execute function public.set_updated_at();
